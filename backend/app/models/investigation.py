import uuid
from datetime import datetime
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import String, Text, DateTime, Integer, func, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base

if TYPE_CHECKING:
    from app.models.profile import Profile
    from app.models.trade import Trade, ContextEvent
    from app.models.alert import Alert
    from app.models.case import Case
    from app.models.report import Report
    from app.models.ai import AIConversation
    from app.models.user import User


class Investigation(Base):
    __tablename__ = "investigations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    profile_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("profiles.id"), nullable=False)
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"), nullable=True) # Optional for backward compatibility during hackathon
    status: Mapped[str] = mapped_column(String(50), default="processing")
    # processing | ready | archived

    # Stats (populated after engine run)
    total_trades: Mapped[int] = mapped_column(Integer, default=0)
    total_alerts: Mapped[int] = mapped_column(Integer, default=0)
    total_cases: Mapped[int] = mapped_column(Integer, default=0)
    escalated_cases: Mapped[int] = mapped_column(Integer, default=0)
    suspicious_traders: Mapped[int] = mapped_column(Integer, default=0)
    avg_risk_score: Mapped[float] = mapped_column(default=0.0)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    profile: Mapped["Profile"] = relationship("Profile", back_populates="investigations")
    trades: Mapped[List["Trade"]] = relationship("Trade", back_populates="investigation", cascade="all, delete-orphan")
    context_events: Mapped[List["ContextEvent"]] = relationship("ContextEvent", back_populates="investigation", cascade="all, delete-orphan")
    alerts: Mapped[List["Alert"]] = relationship("Alert", back_populates="investigation", cascade="all, delete-orphan")
    cases: Mapped[List["Case"]] = relationship("Case", back_populates="investigation", cascade="all, delete-orphan")
    reports: Mapped[List["Report"]] = relationship("Report", back_populates="investigation", cascade="all, delete-orphan")
    ai_conversations: Mapped[List["AIConversation"]] = relationship("AIConversation", back_populates="investigation", cascade="all, delete-orphan")
    user: Mapped[Optional["User"]] = relationship("User", back_populates="investigations")
