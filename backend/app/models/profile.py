import uuid
from datetime import datetime
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import String, Text, DateTime, Boolean, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base

if TYPE_CHECKING:
    from app.models.investigation import Investigation


class Profile(Base):
    __tablename__ = "profiles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="active")  # active, archived
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    stocks: Mapped[List["ProfileStock"]] = relationship("ProfileStock", back_populates="profile", cascade="all, delete-orphan")
    traders: Mapped[List["ProfileTrader"]] = relationship("ProfileTrader", back_populates="profile", cascade="all, delete-orphan")
    investigations: Mapped[List["Investigation"]] = relationship("Investigation", back_populates="profile")


class ProfileStock(Base):
    __tablename__ = "profile_stocks"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    profile_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=False)
    symbol: Mapped[str] = mapped_column(String(50), nullable=False)
    company: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    sector: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    exchange: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)

    # Relationship
    profile: Mapped["Profile"] = relationship("Profile", back_populates="stocks")


class ProfileTrader(Base):
    __tablename__ = "profile_traders"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    profile_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=False)
    trader_id: Mapped[str] = mapped_column(String(100), nullable=False)
    trader_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    desk: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    region: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Relationship
    profile: Mapped["Profile"] = relationship("Profile", back_populates="traders")
