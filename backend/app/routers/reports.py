from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import uuid

from app.database import get_db
from app.models.report import Report
from app.models.investigation import Investigation
from app.models.alert import Alert
from app.models.case import Case
from app.models.trade import Trade, ContextEvent
from app.schemas import ReportCreate, ReportResponse, MessageResponse
from fastapi.responses import FileResponse
from app.services.pdf_generator import generate_reportlab_pdf
from app.models.audit import AppSettings
from app.models.user import User
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/api/reports", tags=["reports"])


@router.get("", response_model=List[ReportResponse])
async def list_reports(
    investigation_id: uuid.UUID = None,
    db: AsyncSession = Depends(get_db),
):
    q = select(Report)
    if investigation_id:
        q = q.where(Report.investigation_id == investigation_id)
    q = q.order_by(Report.created_at.desc())
    result = await db.execute(q)
    return result.scalars().all()


@router.post("/generate", response_model=ReportResponse)
async def generate_report(
    data: ReportCreate,
    investigation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """Generate a structured report for an investigation."""
    inv_result = await db.execute(select(Investigation).where(Investigation.id == investigation_id))
    inv = inv_result.scalar_one_or_none()
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation not found")

    # Build report data based on type
    report_data = {}
    title = ""

    if data.report_type == "market":
        title = f"Market Report — {inv.name}"
        alerts = (await db.execute(select(Alert).where(Alert.investigation_id == investigation_id))).scalars().all()
        cases = (await db.execute(select(Case).where(Case.investigation_id == investigation_id))).scalars().all()
        report_data = {
            "investigation_name": inv.name,
            "total_trades": inv.total_trades,
            "total_alerts": inv.total_alerts,
            "total_cases": inv.total_cases,
            "escalated_cases": inv.escalated_cases,
            "suspicious_traders": inv.suspicious_traders,
            "avg_risk_score": inv.avg_risk_score,
            "patterns": list(set(a.pattern for a in alerts)),
            "top_cases": [
                {"case_ref": c.case_ref, "trader_id": c.trader_id, "symbol": c.symbol,
                 "risk_score": c.risk_score, "status": c.status}
                for c in sorted(cases, key=lambda x: x.risk_score, reverse=True)[:10]
            ],
        }

    elif data.report_type == "trader" and data.subject_id:
        title = f"Trader Investigation Report — {data.subject_id}"
        alerts = (await db.execute(
            select(Alert).where(Alert.investigation_id == investigation_id, Alert.trader_id == data.subject_id)
        )).scalars().all()
        cases = (await db.execute(
            select(Case).where(Case.investigation_id == investigation_id, Case.trader_id == data.subject_id)
        )).scalars().all()
        trades = (await db.execute(
            select(Trade).where(Trade.investigation_id == investigation_id, Trade.trader_id == data.subject_id)
            .order_by(Trade.sequence_num)
        )).scalars().all()
        report_data = {
            "trader_id": data.subject_id,
            "total_trades": len(trades),
            "alerts": [{"pattern": a.pattern, "symbol": a.symbol, "severity": a.severity, "evidence": a.evidence} for a in alerts],
            "cases": [{"case_ref": c.case_ref, "symbol": c.symbol, "risk_score": c.risk_score, "status": c.status} for c in cases],
            "timeline": [{"timestamp": t.timestamp, "symbol": t.symbol, "side": t.side, "quantity": t.quantity, "price": t.price, "status": t.status} for t in trades[:100]],
        }

    elif data.report_type == "stock" and data.subject_id:
        title = f"Stock Surveillance Report — {data.subject_id}"
        symbol = data.subject_id.upper()
        alerts = (await db.execute(
            select(Alert).where(Alert.investigation_id == investigation_id, Alert.symbol == symbol)
        )).scalars().all()
        report_data = {
            "symbol": symbol,
            "alerts": [{"trader_id": a.trader_id, "pattern": a.pattern, "severity": a.severity} for a in alerts],
        }

    elif data.report_type == "case" and data.subject_id:
        case_result = await db.execute(select(Case).where(Case.case_ref == data.subject_id))
        case = case_result.scalar_one_or_none()
        if not case:
            raise HTTPException(status_code=404, detail="Case not found")
        title = f"Case Report — {case.case_ref}"
        report_data = {
            "case_ref": case.case_ref,
            "trader_id": case.trader_id,
            "symbol": case.symbol,
            "patterns": case.patterns,
            "evidence": case.evidence,
            "risk_score": case.risk_score,
            "status": case.status,
        }

    else:
        raise HTTPException(status_code=422, detail="Invalid report_type or missing subject_id")

    report = Report(
        investigation_id=investigation_id,
        report_type=data.report_type,
        title=title,
        subject_id=data.subject_id,
        report_data=report_data,
    )
    db.add(report)
    await db.flush()
    await db.refresh(report)
    return report


@router.delete("/{report_id}", response_model=MessageResponse)
async def delete_report(report_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Report).where(Report.id == report_id))
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    await db.delete(report)
    return MessageResponse(message="Report deleted")

@router.get("/dossier", response_class=FileResponse)
async def generate_dossier(
    trader_id: str,
    investigation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(AppSettings).where(AppSettings.key == "groq_api_key", AppSettings.user_id == str(current_user.id)))
    row = result.scalar_one_or_none()
    groq_api_key = row.value if row else None
    
    if not groq_api_key:
        raise HTTPException(status_code=400, detail="Groq API key is not configured in settings.")
        
    # Fetch data
    alerts = (await db.execute(select(Alert).where(Alert.investigation_id == investigation_id, Alert.trader_id == trader_id))).scalars().all()
    cases = (await db.execute(select(Case).where(Case.investigation_id == investigation_id, Case.trader_id == trader_id))).scalars().all()
    trades = (await db.execute(select(Trade).where(Trade.investigation_id == investigation_id, Trade.trader_id == trader_id))).scalars().all()
    
    best_case = sorted(cases, key=lambda c: c.risk_score, reverse=True)[0] if cases else None
    risk_score = best_case.risk_score if best_case else 0
    
    total_volume = sum(t.quantity for t in trades if t.status == "EXECUTE")
    cancels = len([t for t in trades if t.status == "CANCEL"])
    new_orders = len([t for t in trades if t.status == "NEW"])
    cancel_ratio = (cancels / new_orders * 100) if new_orders > 0 else 0
    symbols = list(set(t.symbol for t in trades))
    
    data = {
        "risk_score": risk_score,
        "executed_volume": total_volume,
        "cancel_ratio": round(cancel_ratio, 1),
        "symbols": symbols,
        "alerts": [
            {
                "pattern": a.pattern,
                "severity": a.severity,
                "confidence": a.confidence,
                "description": a.description
            } for a in alerts
        ]
    }
    
    try:
        pdf_path = await generate_reportlab_pdf(trader_id, data, groq_api_key)
        return FileResponse(
            path=pdf_path,
            filename=f"MarketTrace_Dossier_{trader_id}.pdf",
            media_type="application/pdf"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/investigation-dossier", response_class=FileResponse)
async def generate_investigation_dossier(
    investigation_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from app.services.pdf_generator import generate_investigation_pdf
    
    result = await db.execute(select(AppSettings).where(AppSettings.key == "groq_api_key", AppSettings.user_id == str(current_user.id)))
    row = result.scalar_one_or_none()
    groq_api_key = row.value if row else None
    
    if not groq_api_key:
        raise HTTPException(status_code=400, detail="Groq API key is not configured in settings.")
        
    inv_result = await db.execute(select(Investigation).where(Investigation.id == investigation_id))
    inv = inv_result.scalar_one_or_none()
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation not found")

    alerts = (await db.execute(select(Alert).where(Alert.investigation_id == investigation_id))).scalars().all()
    cases = (await db.execute(select(Case).where(Case.investigation_id == investigation_id))).scalars().all()

    top_symbols = {}
    alert_patterns = {}
    top_traders = {}
    for a in alerts:
        top_symbols[a.symbol] = top_symbols.get(a.symbol, 0) + 1
        alert_patterns[a.pattern] = alert_patterns.get(a.pattern, 0) + 1
        top_traders[a.trader_id] = top_traders.get(a.trader_id, 0) + 1
    # Sort symbols by alert count descending
    top_symbols = dict(sorted(top_symbols.items(), key=lambda item: item[1], reverse=True))
    alert_patterns = dict(sorted(alert_patterns.items(), key=lambda item: item[1], reverse=True))
    top_traders = dict(sorted(top_traders.items(), key=lambda item: item[1], reverse=True))

    sorted_cases = sorted(cases, key=lambda c: c.risk_score, reverse=True)
    top_cases = [
        {"case_ref": c.case_ref, "trader_id": c.trader_id, "risk_score": c.risk_score, "status": c.status}
        for c in sorted_cases
    ]

    data = {
        "total_trades": inv.total_trades,
        "total_alerts": inv.total_alerts,
        "total_cases": inv.total_cases,
        "escalated_cases": inv.escalated_cases,
        "top_symbols": top_symbols,
        "alert_patterns": alert_patterns,
        "top_traders": top_traders,
        "top_cases": top_cases
    }
    
    try:
        pdf_path = await generate_investigation_pdf(inv.name, data, groq_api_key)
        return FileResponse(
            path=pdf_path,
            filename=f"Market_Report_{inv.name.replace(' ', '_')}.pdf",
            media_type="application/pdf"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

