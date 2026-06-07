from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import List
import uuid

from app.database import get_db
from app.models.profile import Profile, ProfileStock, ProfileTrader
from app.models.investigation import Investigation
from app.models.user import User
from app.services.auth_service import get_current_user
from app.schemas import ProfileCreate, ProfileUpdate, ProfileResponse, ProfileListResponse, MessageResponse
from app.engine.csv_parser import parse_stocks_csv, parse_traders_csv

router = APIRouter(prefix="/api/profiles", tags=["profiles"])


@router.get("", response_model=List[ProfileListResponse])
async def list_profiles(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(
        select(Profile).where(Profile.status != "deleted", Profile.user_id == current_user.id).order_by(Profile.created_at.desc())
    )
    profiles = result.scalars().all()
    out = []
    for p in profiles:
        stocks_result = await db.execute(select(func.count()).select_from(ProfileStock).where(ProfileStock.profile_id == p.id))
        traders_result = await db.execute(select(func.count()).select_from(ProfileTrader).where(ProfileTrader.profile_id == p.id))
        out.append(ProfileListResponse(
            id=p.id, name=p.name, description=p.description, status=p.status,
            created_at=p.created_at,
            stock_count=stocks_result.scalar() or 0,
            trader_count=traders_result.scalar() or 0,
        ))
    return out


@router.post("", response_model=ProfileListResponse)
async def create_profile(data: ProfileCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    profile = Profile(name=data.name, description=data.description, user_id=current_user.id)
    db.add(profile)
    await db.flush()
    await db.refresh(profile)
    return ProfileListResponse(id=profile.id, name=profile.name, description=profile.description,
                               status=profile.status, created_at=profile.created_at)


@router.get("/{profile_id}", response_model=ProfileResponse)
async def get_profile(profile_id: uuid.UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Profile).where(Profile.id == profile_id, Profile.user_id == current_user.id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    stocks = (await db.execute(select(ProfileStock).where(ProfileStock.profile_id == profile_id))).scalars().all()
    traders = (await db.execute(select(ProfileTrader).where(ProfileTrader.profile_id == profile_id))).scalars().all()
    inv_count = (await db.execute(select(func.count()).select_from(Investigation).where(Investigation.profile_id == profile_id))).scalar() or 0
    return ProfileResponse(
        id=profile.id, name=profile.name, description=profile.description,
        status=profile.status, created_at=profile.created_at,
        stocks=[{"symbol": s.symbol, "company": s.company, "sector": s.sector, "exchange": s.exchange} for s in stocks],
        traders=[{"trader_id": t.trader_id, "trader_name": t.trader_name, "desk": t.desk, "region": t.region} for t in traders],
        investigation_count=inv_count,
    )


@router.put("/{profile_id}", response_model=ProfileListResponse)
async def update_profile(profile_id: uuid.UUID, data: ProfileUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Profile).where(Profile.id == profile_id, Profile.user_id == current_user.id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    if data.name is not None:
        profile.name = data.name
    if data.description is not None:
        profile.description = data.description
    if data.status is not None:
        profile.status = data.status
    return MessageResponse(message="Profile updated")


@router.delete("/{profile_id}", response_model=MessageResponse)
async def delete_profile(profile_id: uuid.UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    result = await db.execute(select(Profile).where(Profile.id == profile_id, Profile.user_id == current_user.id))
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    profile.status = "deleted"
    return MessageResponse(message="Profile archived")


@router.post("/{profile_id}/upload-stocks", response_model=MessageResponse)
async def upload_stocks(
    profile_id: uuid.UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify ownership
    result = await db.execute(select(Profile).where(Profile.id == profile_id, Profile.user_id == current_user.id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Profile not found")

    content = await file.read()
    result = parse_stocks_csv(content)
    if not result.success and not result.rows:
        raise HTTPException(status_code=422, detail={"errors": result.errors})

    # Clear existing stocks
    existing = (await db.execute(select(ProfileStock).where(ProfileStock.profile_id == profile_id))).scalars().all()
    for s in existing:
        await db.delete(s)

    for row in result.rows:
        db.add(ProfileStock(profile_id=profile_id, **row))

    return MessageResponse(message=f"Loaded {len(result.rows)} stocks. Warnings: {len(result.warnings)}")


@router.post("/{profile_id}/upload-traders", response_model=MessageResponse)
async def upload_traders(
    profile_id: uuid.UUID,
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify ownership
    result = await db.execute(select(Profile).where(Profile.id == profile_id, Profile.user_id == current_user.id))
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Profile not found")

    content = await file.read()
    result = parse_traders_csv(content)
    if not result.success and not result.rows:
        raise HTTPException(status_code=422, detail={"errors": result.errors})

    existing = (await db.execute(select(ProfileTrader).where(ProfileTrader.profile_id == profile_id))).scalars().all()
    for t in existing:
        await db.delete(t)

    for row in result.rows:
        db.add(ProfileTrader(profile_id=profile_id, **row))

    return MessageResponse(message=f"Loaded {len(result.rows)} traders. Warnings: {len(result.warnings)}")
