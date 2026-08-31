from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import Column, DateTime, Float, Index, Integer, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlmodel import Field, SQLModel


class MediaCommentTable(SQLModel, table=True):
    __tablename__ = "media_comments"

    id: UUID = Field(
        sa_column=Column(PG_UUID(as_uuid=True), primary_key=True),
    )
    organization_id: UUID = Field(
        sa_column=Column(
            PG_UUID(as_uuid=True),
            nullable=False,
            index=True,
        )
    )
    project_id: UUID = Field(
        sa_column=Column(
            PG_UUID(as_uuid=True),
            nullable=False,
            index=True,
        )
    )
    media_id: UUID = Field(
        sa_column=Column(
            PG_UUID(as_uuid=True),
            nullable=False,
            index=True,
        )
    )
    user_id: UUID = Field(
        sa_column=Column(
            PG_UUID(as_uuid=True),
            nullable=False,
            index=True,
        )
    )
    parent_comment_id: UUID | None = Field(
        default=None,
        sa_column=Column(
            PG_UUID(as_uuid=True),
            nullable=True,
            index=True,
        ),
    )
    timestamp_seconds: float | None = Field(
        default=None,
        sa_column=Column(Float, nullable=True),
    )
    frame_number: int | None = Field(
        default=None,
        sa_column=Column(Integer, nullable=True),
    )
    content: str = Field(
        sa_column=Column(String(5000), nullable=False),
    )
    annotation_data: dict[str, Any] | None = Field(
        default=None,
        sa_column=Column(JSONB, nullable=True),
    )
    status: str = Field(
        default="open",
        sa_column=Column(String(32), nullable=False, default="open"),
    )
    created_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
    updated_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )
    deleted_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )

    __table_args__ = (
        Index(
            "ix_media_comments_lookup",
            "organization_id",
            "project_id",
            "media_id",
            "deleted_at",
            "timestamp_seconds",
        ),
    )
