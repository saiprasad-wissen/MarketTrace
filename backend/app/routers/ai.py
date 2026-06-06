from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid

from app.database import get_db
from app.models.investigation import Investigation
from app.models.alert import Alert
from app.models.case import Case
from app.models.trade import ContextEvent
from app.models.ai import AIConversation
from app.schemas import AIAskRequest, AIAskResponse
from app.services.groq_service import ask_groq
from app.models.settings import AppSettings

router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.post("/ask", response_model=AIAskResponse)
async def ask_ai(request: AIAskRequest, db: AsyncSession = Depends(get_db)):
    """
    Context-aware AI investigation copilot.
    Dynamically injects current investigation data into the system prompt.
    """
    # Load investigation
    inv_result = await db.execute(select(Investigation).where(Investigation.id == request.investigation_id))
    inv = inv_result.scalar_one_or_none()
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation not found")

    # Load alerts
    alerts = (await db.execute(
        select(Alert).where(Alert.investigation_id == request.investigation_id).order_by(Alert.created_at.desc())
    )).scalars().all()

    # Load context events
    context_events = (await db.execute(
        select(ContextEvent).where(ContextEvent.investigation_id == request.investigation_id)
    )).scalars().all()

    # Load cases
    cases = (await db.execute(
        select(Case).where(Case.investigation_id == request.investigation_id).order_by(Case.risk_score.desc())
    )).scalars().all()

    # Get Groq API key from settings
    key_setting = (await db.execute(select(AppSettings).where(AppSettings.key == "groq_api_key"))).scalar_one_or_none()
    groq_key = key_setting.value if key_setting else ""

    # Build suspicious traders list from alerts (dynamic — not hardcoded)
    trader_patterns: dict = {}
    trader_scores: dict = {}
    for a in alerts:
        if a.trader_id not in trader_patterns:
            trader_patterns[a.trader_id] = set()
        trader_patterns[a.trader_id].add(a.pattern)
    for c in cases:
        trader_scores[c.trader_id] = c.risk_score

    suspicious_traders = [
        {
            "trader_id": tid,
            "risk_score": trader_scores.get(tid, 0),
            "patterns": list(patterns),
        }
        for tid, patterns in trader_patterns.items()
    ]

    # Build investigation context
    investigation_context = {
        "investigation_name": inv.name,
        "total_trades": inv.total_trades,
        "total_alerts": inv.total_alerts,
        "total_cases": inv.total_cases,
        "suspicious_traders": sorted(suspicious_traders, key=lambda x: x["risk_score"], reverse=True),
        "alerts": [
            {
                "trader_id": a.trader_id,
                "symbol": a.symbol,
                "pattern": a.pattern,
                "severity": a.severity,
                "confidence": a.confidence,
                "evidence": a.evidence,
            }
            for a in alerts[:20]
        ],
        "context_events": [
            {
                "timestamp": e.timestamp,
                "symbol": e.symbol,
                "severity": e.severity,
                "title": e.title,
            }
            for e in context_events
        ],
        "current_focus": request.context_id,
        "groq_api_key": groq_key,
    }

    # Load or create conversation
    conv = None
    if request.context_type and request.context_id:
        conv_result = await db.execute(
            select(AIConversation).where(
                AIConversation.investigation_id == request.investigation_id,
                AIConversation.context_type == request.context_type,
                AIConversation.context_id == request.context_id,
            )
        )
        conv = conv_result.scalar_one_or_none()

    history = [{"role": m.role, "content": m.content} for m in request.conversation_history]

    # Ask Groq
    answer = await ask_groq(request.question, history, investigation_context)

    # Persist conversation
    if conv:
        messages = conv.messages or []
        messages.append({"role": "user", "content": request.question})
        messages.append({"role": "assistant", "content": answer})
        conv.messages = messages
    else:
        conv = AIConversation(
            investigation_id=request.investigation_id,
            context_type=request.context_type,
            context_id=request.context_id,
            messages=[
                {"role": "user", "content": request.question},
                {"role": "assistant", "content": answer},
            ],
        )
        db.add(conv)
        await db.flush()

    return AIAskResponse(answer=answer, conversation_id=conv.id)
