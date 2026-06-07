from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
import uuid

from app.database import get_db
from app.models.alert import Alert
from app.schemas import AlertResponse

router = APIRouter(prefix="/api/investigations", tags=["alerts"])
global_router = APIRouter(prefix="/api/alerts", tags=["alerts-global"])

@global_router.get("", response_model=List[AlertResponse])
async def get_global_alerts(
    trader_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    q = select(Alert)
    if trader_id:
        q = q.where(Alert.trader_id == trader_id)
    q = q.order_by(Alert.created_at.desc())
    result = await db.execute(q)
    return result.scalars().all()

@router.get("/{inv_id}/alerts", response_model=List[AlertResponse])
async def get_alerts(
    inv_id: uuid.UUID,
    symbol: Optional[str] = Query(None),
    trader_id: Optional[str] = Query(None),
    pattern: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    q = select(Alert).where(Alert.investigation_id == inv_id)
    if symbol:
        q = q.where(Alert.symbol == symbol.upper())
    if trader_id:
        q = q.where(Alert.trader_id == trader_id)
    if pattern:
        q = q.where(Alert.pattern == pattern)
    if severity:
        q = q.where(Alert.severity == severity.upper())
    q = q.order_by(Alert.created_at.desc())
    result = await db.execute(q)
    return result.scalars().all()

from pydantic import BaseModel
class FalsePositiveToggle(BaseModel):
    is_false_positive: bool

@global_router.patch("/{alert_id}/false-positive")
async def toggle_false_positive(
    alert_id: uuid.UUID,
    payload: FalsePositiveToggle,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Alert).where(Alert.id == alert_id))
    alert = result.scalar_one_or_none()
    if not alert:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Alert not found")
    
    alert.is_false_positive = payload.is_false_positive
    await db.commit()
    return {"status": "success", "is_false_positive": alert.is_false_positive}
