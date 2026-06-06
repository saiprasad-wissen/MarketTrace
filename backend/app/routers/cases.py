from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
import uuid

from app.database import get_db
from app.models.case import Case, CaseComment
from app.models.investigation import Investigation
from app.models.trade import Trade, ContextEvent
from app.schemas import CaseResponse, CaseUpdate, CaseCommentCreate, CaseCommentResponse, MessageResponse

router = APIRouter(prefix="/api/cases", tags=["cases"])


@router.get("", response_model=List[CaseResponse])
async def list_cases(
    investigation_id: Optional[uuid.UUID] = Query(None),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    trader_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    q = select(Case).join(Investigation, Case.investigation_id == Investigation.id).where(Investigation.status != "deleted")
    if investigation_id:
        q = q.where(Case.investigation_id == investigation_id)
    if status:
        q = q.where(Case.status == status)
    if priority:
        q = q.where(Case.priority == priority)
    if trader_id:
        q = q.where(Case.trader_id == trader_id)
    q = q.order_by(Case.risk_score.desc())
    result = await db.execute(q)
    cases = result.scalars().all()

    # Load comments for each case
    out = []
    for c in cases:
        comments = (await db.execute(
            select(CaseComment).where(CaseComment.case_id == c.id).order_by(CaseComment.created_at)
        )).scalars().all()
        case_dict = {
            "id": c.id, "investigation_id": c.investigation_id, "case_ref": c.case_ref, "trader_id": c.trader_id,
            "symbol": c.symbol, "patterns": c.patterns, "evidence": c.evidence,
            "risk_score": c.risk_score, "priority": c.priority, "status": c.status,
            "assigned_to": c.assigned_to, "ai_analysis": c.ai_analysis,
            "created_at": c.created_at, "updated_at": c.updated_at,
            "comments": [{"id": cm.id, "author": cm.author, "content": cm.content, "created_at": cm.created_at} for cm in comments],
        }
        out.append(CaseResponse(**case_dict))
    return out


@router.get("/{case_id}", response_model=CaseResponse)
async def get_case(case_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Case).where(Case.id == case_id))
    case = result.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    comments = (await db.execute(
        select(CaseComment).where(CaseComment.case_id == case_id).order_by(CaseComment.created_at)
    )).scalars().all()
    return CaseResponse(
        id=case.id, investigation_id=case.investigation_id, case_ref=case.case_ref, trader_id=case.trader_id,
        symbol=case.symbol, patterns=case.patterns, evidence=case.evidence,
        risk_score=case.risk_score, priority=case.priority, status=case.status,
        assigned_to=case.assigned_to, ai_analysis=case.ai_analysis,
        created_at=case.created_at, updated_at=case.updated_at,
        comments=[{"id": c.id, "author": c.author, "content": c.content, "created_at": c.created_at} for c in comments],
    )


@router.put("/{case_id}", response_model=MessageResponse)
async def update_case(case_id: uuid.UUID, data: CaseUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Case).where(Case.id == case_id))
    case = result.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")

    valid_statuses = {"Open", "Investigating", "Escalated", "Closed"}
    if data.status and data.status not in valid_statuses:
        raise HTTPException(status_code=422, detail=f"Invalid status. Must be one of: {valid_statuses}")

    if data.status:
        if data.status == "Escalated" and case.status != "Escalated":
            from app.services.integrations import dispatch_escalation
            import asyncio
            asyncio.create_task(dispatch_escalation(
                case.case_ref, 
                case.trader_id, 
                str(case.patterns), 
                case.risk_score, 
                case.evidence if isinstance(case.evidence, dict) else {}
            ))
        case.status = data.status
    if data.assigned_to is not None:
        case.assigned_to = data.assigned_to
    if data.ai_analysis is not None:
        case.ai_analysis = data.ai_analysis
    if data.priority:
        case.priority = data.priority

    return MessageResponse(message="Case updated")


@router.post("/{case_id}/comments", response_model=CaseCommentResponse)
async def add_comment(case_id: uuid.UUID, data: CaseCommentCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Case).where(Case.id == case_id))
    case = result.scalar_one_or_none()
    if not case:
        raise HTTPException(status_code=404, detail="Case not found")
    comment = CaseComment(case_id=case_id, author=data.author, content=data.content)
    db.add(comment)
    await db.flush()
    await db.refresh(comment)
    return CaseCommentResponse(id=comment.id, author=comment.author, content=comment.content, created_at=comment.created_at)


