from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import uuid

from app.database import get_db
from app.models.investigation import Investigation
from app.models.trade import Trade, ContextEvent
from app.models.user import User
from app.models.alert import Alert
from app.models.case import Case
from app.models.trader_analysis import TraderAnalysis
from app.schemas import (
    InvestigationCreate, InvestigationUpdate, InvestigationResponse, MessageResponse
)
from app.engine.csv_parser import parse_trades_csv, parse_context_csv
from app.engine.surveillance import TradeRecord, run_surveillance
from app.engine.risk_scorer import compute_risk_scores
from app.engine.case_builder import build_cases, get_investigation_stats
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/api/investigations", tags=["investigations"])


@router.get("", response_model=List[InvestigationResponse])
async def list_investigations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(
        select(Investigation).where(Investigation.status != "deleted", Investigation.user_id == current_user.id).order_by(Investigation.created_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=InvestigationResponse)
async def create_investigation(
    data: InvestigationCreate, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    inv = Investigation(name=data.name, profile_id=data.profile_id, user_id=current_user.id, status="created")
    db.add(inv)
    await db.flush()
    await db.refresh(inv)
    return inv


@router.get("/{inv_id}", response_model=InvestigationResponse)
async def get_investigation(
    inv_id: uuid.UUID, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Investigation).where(Investigation.id == inv_id))
    inv = result.scalar_one_or_none()
    if not inv or str(inv.user_id) != str(current_user.id):
        raise HTTPException(status_code=404, detail="Investigation not found")
    return inv


@router.put("/{inv_id}", response_model=MessageResponse)
async def update_investigation(
    inv_id: uuid.UUID, 
    data: InvestigationUpdate, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Investigation).where(Investigation.id == inv_id))
    inv = result.scalar_one_or_none()
    if not inv or str(inv.user_id) != str(current_user.id):
        raise HTTPException(status_code=404, detail="Investigation not found")
    if data.name:
        inv.name = data.name
    if data.status:
        inv.status = data.status
    return MessageResponse(message="Updated")


@router.delete("/{inv_id}", response_model=MessageResponse)
async def delete_investigation(
    inv_id: uuid.UUID, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Investigation).where(Investigation.id == inv_id))
    inv = result.scalar_one_or_none()
    if not inv or str(inv.user_id) != str(current_user.id):
        raise HTTPException(status_code=404, detail="Investigation not found")
    inv.status = "deleted"

    # Cascade delete cases so they don't persist in the global Watchlist
    existing_cases = (await db.execute(select(Case).where(Case.investigation_id == inv_id))).scalars().all()
    for c in existing_cases:
        await db.delete(c)

    return MessageResponse(message="Investigation archived and cases removed")


@router.post("/{inv_id}/upload-trades", response_model=MessageResponse)
async def upload_trades(
    inv_id: uuid.UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Investigation).where(Investigation.id == inv_id))
    inv = result.scalar_one_or_none()
    if not inv or str(inv.user_id) != str(current_user.id):
        raise HTTPException(status_code=404, detail="Investigation not found")
    
    content = await file.read()
    result = parse_trades_csv(content)

    if not result.success and not result.rows:
        raise HTTPException(status_code=422, detail={"errors": result.errors})

    # Clear existing trades
    existing = (await db.execute(select(Trade).where(Trade.investigation_id == inv_id))).scalars().all()
    for t in existing:
        await db.delete(t)
    await db.flush()

    for i, row in enumerate(result.rows):
        db.add(Trade(investigation_id=inv_id, sequence_num=i, **row))

    return MessageResponse(
        message=f"Uploaded {len(result.rows)} trade records. Errors: {len(result.errors)}"
    )


@router.post("/{inv_id}/upload-context", response_model=MessageResponse)
async def upload_context(
    inv_id: uuid.UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
):
    content = await file.read()
    result = parse_context_csv(content)

    existing = (await db.execute(select(ContextEvent).where(ContextEvent.investigation_id == inv_id))).scalars().all()
    for e in existing:
        await db.delete(e)
    await db.flush()

    for row in result.rows:
        db.add(ContextEvent(investigation_id=inv_id, **row))

    return MessageResponse(message=f"Loaded {len(result.rows)} context events")


@router.post("/{inv_id}/run", response_model=MessageResponse)
async def run_investigation(
    inv_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Trigger the surveillance engine. Runs as a background task."""
    result = await db.execute(select(Investigation).where(Investigation.id == inv_id))
    inv = result.scalar_one_or_none()
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation not found")

    inv.status = "processing"
    await db.commit()

    background_tasks.add_task(_run_engine_task, inv_id)
    return MessageResponse(message="Investigation engine started")


async def _run_engine_task(inv_id: uuid.UUID):
    """Background task: run full surveillance pipeline."""
    from app.database import AsyncSessionLocal
    from app.services.integrations import dispatch_escalation
    from app.services.claude_service import generate_batch_case_reasoning, generate_trader_profile_reasoning
    import asyncio
    
    async with AsyncSessionLocal() as db:
        try:
            # Fetch user_id for multi-tenant isolation
            inv_result = await db.execute(select(Investigation).where(Investigation.id == inv_id))
            inv = inv_result.scalar_one_or_none()
            if not inv: return
            user_id = str(inv.user_id)
            # Load trades
            trades_result = await db.execute(
                select(Trade).where(Trade.investigation_id == inv_id).order_by(Trade.sequence_num)
            )
            trade_rows = trades_result.scalars().all()

            # Convert to TradeRecord objects
            trade_records = [
                TradeRecord(
                    timestamp=t.timestamp,
                    trader_id=t.trader_id,
                    symbol=t.symbol,
                    side=t.side,
                    quantity=t.quantity,
                    price=t.price,
                    order_id=t.order_id,
                    status=t.status,
                    sequence_num=t.sequence_num,
                )
                for t in trade_rows
            ]

            # Run surveillance
            detected_alerts = run_surveillance(trade_records)

            # Compute risk profiles
            risk_profiles = compute_risk_scores(detected_alerts)

            # Build cases
            inv_short_id = str(inv_id)[:8].upper()
            trade_dicts = [
                {"symbol": t.symbol, "trader_id": t.trader_id, "quantity": t.quantity}
                for t in trade_rows
            ]
            cases_data = build_cases(detected_alerts, risk_profiles, inv_short_id)

            # Persist alerts
            existing_alerts = (await db.execute(select(Alert).where(Alert.investigation_id == inv_id))).scalars().all()
            for a in existing_alerts:
                await db.delete(a)

            for alert in detected_alerts:
                db.add(Alert(
                    investigation_id=inv_id,
                    trader_id=alert.trader_id,
                    symbol=alert.symbol,
                    pattern=alert.pattern,
                    severity=alert.severity,
                    confidence=alert.confidence,
                    start_time=alert.start_time,
                    end_time=alert.end_time,
                    evidence=alert.evidence,
                    description=alert.description,
                ))

            # Persist cases
            existing_cases = (await db.execute(select(Case).where(Case.investigation_id == inv_id))).scalars().all()
            for c in existing_cases:
                await db.delete(c)

            escalation_tasks = []
            for case_data in cases_data:
                db.add(Case(investigation_id=inv_id, **case_data))
                
            # Persist first so cases have IDs and can be queried by integrations
            await db.commit()

            escalation_tasks = []
            for case_data in cases_data:
                if case_data["status"] == "Escalated":
                    # We trigger the integrations in the background
                    escalation_tasks.append(
                        dispatch_escalation(
                            case_ref=case_data["case_ref"],
                            trader_id=case_data["trader_id"],
                            patterns=case_data["patterns"],
                            risk_score=case_data["risk_score"],
                            evidence=case_data["evidence"],
                            user_id=user_id
                        )
                    )

            if escalation_tasks:
                await asyncio.gather(*escalation_tasks)

            # Refetch cases for AI generation
            saved_cases = (await db.execute(select(Case).where(Case.investigation_id == inv_id))).scalars().all()
            
            # ---------------------------------------------------------
            # AI GENERATION: Llama 3.3 Case Batching
            # ---------------------------------------------------------
            context_events_result = await db.execute(select(ContextEvent).where(ContextEvent.investigation_id == inv_id))
            context_events = context_events_result.scalars().all()
            
            # Fetch False Positives for this profile
            fp_result = await db.execute(select(Alert).where(Alert.is_false_positive == True))
            false_positive_alerts = fp_result.scalars().all()

            case_dicts = [{"case_id": str(c.id), "trader_id": c.trader_id, "symbol": c.symbol, "risk_score": c.risk_score, "patterns": c.patterns, "evidence": c.evidence} for c in saved_cases]
            
            batch_size = 5
            for i in range(0, len(case_dicts), batch_size):
                batch = case_dicts[i:i+batch_size]
                reasoning_dict = await generate_batch_case_reasoning(batch, trade_rows, context_events, false_positive_alerts, db, user_id)
                
                for c in saved_cases:
                    cid = str(c.id)
                    if cid in reasoning_dict:
                        c.ai_analysis = reasoning_dict[cid]
                import asyncio
                await asyncio.sleep(4)  # Wait to avoid Groq 429 rate limits
            
            # Update investigation stats
            stats = get_investigation_stats(trade_dicts, detected_alerts, cases_data, risk_profiles)
            inv_result = await db.execute(select(Investigation).where(Investigation.id == inv_id))
            inv = inv_result.scalar_one()
            inv.total_trades = stats["total_trades"]
            inv.total_alerts = stats["total_alerts"]
            inv.total_cases = stats["total_cases"]
            inv.escalated_cases = stats["escalated_cases"]
            inv.suspicious_traders = stats["suspicious_traders"]
            inv.avg_risk_score = stats["avg_risk_score"]
            inv.status = "ready"

            await db.commit()

        except Exception as e:
            await db.rollback()
            # Mark investigation as failed
            async with AsyncSessionLocal() as err_db:
                inv_result = await err_db.execute(select(Investigation).where(Investigation.id == inv_id))
                inv = inv_result.scalar_one_or_none()
                if inv:
                    inv.status = "error"
                    await err_db.commit()
            raise

@router.get("/{inv_id}/traders/{trader_id}/analysis")
async def get_trader_analysis(inv_id: uuid.UUID, trader_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(TraderAnalysis)
        .where(TraderAnalysis.investigation_id == inv_id)
        .where(TraderAnalysis.trader_id == trader_id)
    )
    analysis = result.scalar_one_or_none()
    if not analysis:
        return {"ai_profile": "AI Analysis not generated for this trader yet."}
    return {"ai_profile": analysis.ai_profile}
