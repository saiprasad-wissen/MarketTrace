from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
import uuid

from app.database import get_db
from app.models.trade import Trade, ContextEvent
from app.models.investigation import Investigation
from app.models.user import User
from app.services.auth_service import get_current_user
from app.schemas import TradeResponse, ContextEventResponse
from fastapi import HTTPException

router = APIRouter(prefix="/api/investigations", tags=["trades"])


@router.get("/{inv_id}/trades", response_model=List[TradeResponse])
async def get_trades(
    inv_id: uuid.UUID,
    symbol: Optional[str] = Query(None),
    trader_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    limit: int = Query(500, le=5000),
    offset: int = Query(0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    inv_result = await db.execute(select(Investigation).where(Investigation.id == inv_id))
    inv = inv_result.scalar_one_or_none()
    if not inv or str(inv.user_id) != str(current_user.id):
        raise HTTPException(status_code=404, detail="Investigation not found")

    q = select(Trade).where(Trade.investigation_id == inv_id)
    if symbol:
        q = q.where(Trade.symbol == symbol.upper())
    if trader_id:
        q = q.where(Trade.trader_id == trader_id)
    if status:
        q = q.where(Trade.status == status.upper())
    q = q.order_by(Trade.sequence_num).limit(limit).offset(offset)
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/{inv_id}/context-events", response_model=List[ContextEventResponse])
async def get_context_events(
    inv_id: uuid.UUID,
    symbol: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    inv_result = await db.execute(select(Investigation).where(Investigation.id == inv_id))
    inv = inv_result.scalar_one_or_none()
    if not inv or str(inv.user_id) != str(current_user.id):
        raise HTTPException(status_code=404, detail="Investigation not found")

    q = select(ContextEvent).where(ContextEvent.investigation_id == inv_id)
    if symbol:
        q = q.where(ContextEvent.symbol == symbol.upper())
    result = await db.execute(q)
    return result.scalars().all()


@router.get("/{inv_id}/symbols")
async def get_symbols(
    inv_id: uuid.UUID, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all unique symbols in this investigation."""
    inv_result = await db.execute(select(Investigation).where(Investigation.id == inv_id))
    inv = inv_result.scalar_one_or_none()
    if not inv or str(inv.user_id) != str(current_user.id):
        raise HTTPException(status_code=404, detail="Investigation not found")
        
    result = await db.execute(
        select(Trade.symbol).where(Trade.investigation_id == inv_id).distinct()
    )
    return {"symbols": sorted([r[0] for r in result.all()])}


@router.get("/{inv_id}/trader-ids")
async def get_trader_ids(
    inv_id: uuid.UUID, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all unique trader IDs in this investigation."""
    inv_result = await db.execute(select(Investigation).where(Investigation.id == inv_id))
    inv = inv_result.scalar_one_or_none()
    if not inv or str(inv.user_id) != str(current_user.id):
        raise HTTPException(status_code=404, detail="Investigation not found")
    result = await db.execute(
        select(Trade.trader_id).where(Trade.investigation_id == inv_id).distinct()
    )
    return {"trader_ids": sorted([r[0] for r in result.all()])}
