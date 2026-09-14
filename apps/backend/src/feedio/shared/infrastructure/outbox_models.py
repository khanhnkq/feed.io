from datetime import datetime
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import Column, DateTime, Index, Integer, String, Text, func, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlmodel import Field, SQLModel

from feedio.shared.infrastructure.persistence import utc_now


class OutboxEventTable(SQLModel, table=True):
    __tablename__ = "outbox_events"
    __table_args__ = (
        Index(
            "ix_outbox_events_pending",
            "available_at",
            "id",
            postgresql_where=text("processed_at IS NULL"),
        ),
        Index(
            "ix_outbox_events_org_agg",
            "organization_id",
            "aggregate_type",
            "aggregate_id",
        ),
    )

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    organization_id: UUID = Field(
        foreign_key="organizations.id",
        ondelete="CASCADE",
        index=True,
    )
    aggregate_type: str = Field(
        sa_column=Column(String(50), nullable=False),
    )
    aggregate_id: UUID = Field(
        sa_column=Column(PG_UUID(as_uuid=True), nullable=False),
    )
    event_type: str = Field(
        sa_column=Column(String(100), nullable=False),
    )
    payload: dict[str, Any] = Field(
        sa_column=Column(JSONB, nullable=False),
    )
    occurred_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(DateTime(timezone=True), nullable=False, server_default=func.now()),
    )
    available_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(DateTime(timezone=True), nullable=False, server_default=func.now()),
    )
    processed_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )
    attempts: int = Field(
        default=0,
        sa_column=Column(Integer(), nullable=False, server_default="0"),
    )
    last_error: str | None = Field(
        default=None,
        sa_column=Column(Text(), nullable=True),
    )
