import uuid
from datetime import datetime
from typing import Optional, List
from sqlalchemy import String, Text, DateTime, Float, JSON, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base


class Case(Base):
    __tablename__ = "cases"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    investigation_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("investigations.id"), nullable=False)

    case_ref: Mapped[str] = mapped_column(String(50), nullable=False, unique=True)
    # Auto-generated: MT-{investigation_short_id}-{sequence}

    trader_id: Mapped[str] = mapped_column(String(100), nullable=False)
    symbol: Mapped[str] = mapped_column(String(50), nullable=False)

    # Patterns (comma-separated list of detected patterns for this case)
    patterns: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Evidence summary (JSON)
    evidence: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    risk_score: Mapped[float] = mapped_column(Float, default=0.0)
    priority: Mapped[str] = mapped_column(String(20), default="Medium")   # Critical | High | Medium | Low
    status: Mapped[str] = mapped_column(String(50), default="Open")
    # Open | Investigating | Escalated | Closed

    assigned_to: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    ai_analysis: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    investigation: Mapped["Investigation"] = relationship("Investigation", back_populates="cases")
    comments: Mapped[List["CaseComment"]] = relationship("CaseComment", back_populates="case", cascade="all, delete-orphan")


class CaseComment(Base):
    __tablename__ = "case_comments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    case_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("cases.id"), nullable=False)
    author: Mapped[str] = mapped_column(String(255), default="Analyst")
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationship
    case: Mapped["Case"] = relationship("Case", back_populates="comments")
