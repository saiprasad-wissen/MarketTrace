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


class AIConversation(Base):
    __tablename__ = "ai_conversations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    investigation_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("investigations.id"), nullable=False)

    # Context at time of question
    context_type: Mapped[str] = mapped_column(String(50), nullable=False)
    # investigation | trader | stock | case
    context_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Conversation history stored as JSON array of {role, content} dicts
    messages: Mapped[Optional[list]] = mapped_column(JSON, nullable=True, default=list)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationship
    investigation: Mapped["Investigation"] = relationship("Investigation", back_populates="ai_conversations")
