import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Text, DateTime, Integer, Float, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.investigation import Investigation


class Trade(Base):
    """
    Represents a single order event from a trades CSV.
    One logical order can have multiple rows: NEW, EXECUTE, CANCEL.
    The CSV schema must have: timestamp, trader_id, symbol, side, quantity, price, order_id, status
    """
    __tablename__ = "trades"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    investigation_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("investigations.id"), nullable=False)

    # Core fields from CSV (dynamically mapped - not hardcoded to specific values)
    timestamp: Mapped[str] = mapped_column(String(50), nullable=False)   # Raw timestamp string from CSV
    trader_id: Mapped[str] = mapped_column(String(100), nullable=False)
    symbol: Mapped[str] = mapped_column(String(50), nullable=False)
    side: Mapped[str] = mapped_column(String(10), nullable=False)        # BUY / SELL
    quantity: Mapped[float] = mapped_column(Float, nullable=False)
    price: Mapped[float] = mapped_column(Float, nullable=False)
    order_id: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)      # NEW / EXECUTE / CANCEL

    # Computed / derived
    sequence_num: Mapped[int] = mapped_column(Integer, default=0)        # Sort order within session

    # Relationship
    investigation: Mapped["Investigation"] = relationship("Investigation", back_populates="trades")


class ContextEvent(Base):
    """
    Market context events from context CSV.
    Schema: timestamp, symbol, type, severity, title, summary
    """
    __tablename__ = "context_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    investigation_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("investigations.id"), nullable=False)

    timestamp: Mapped[str] = mapped_column(String(50), nullable=False)
    symbol: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)   # Can be MARKET-wide
    event_type: Mapped[str] = mapped_column(String(50), nullable=False)         # NEWS / ANALYST / MACRO / CORPORATE
    severity: Mapped[str] = mapped_column(String(20), nullable=False)           # HIGH / MEDIUM / LOW
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Relationship
    investigation: Mapped["Investigation"] = relationship("Investigation", back_populates="context_events")
