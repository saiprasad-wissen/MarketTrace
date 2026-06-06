import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Text, DateTime, JSON, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
from app.database import Base
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.investigation import Investigation


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    investigation_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("investigations.id"), nullable=False)

    report_type: Mapped[str] = mapped_column(String(50), nullable=False)
    # market | stock | trader | case

    title: Mapped[str] = mapped_column(String(500), nullable=False)
    subject_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    # trader_id, symbol, or case_ref depending on report_type

    content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    # Structured JSON or HTML content
    report_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # Relationship
    investigation: Mapped["Investigation"] = relationship("Investigation", back_populates="reports")
