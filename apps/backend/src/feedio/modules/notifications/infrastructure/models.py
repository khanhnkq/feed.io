from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy import DateTime, String
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID
from sqlmodel import Column, Field, SQLModel

from feedio.modules.notifications.domain.entities import Notification
from feedio.modules.notifications.domain.enums import NotificationType


class NotificationTable(SQLModel, table=True):
    __tablename__ = "notifications"

    id: UUID = Field(
        sa_column=Column(PG_UUID(as_uuid=True), primary_key=True),
    )
    user_id: UUID = Field(
        sa_column=Column(PG_UUID(as_uuid=True), nullable=False, index=True),
    )
    organization_id: UUID = Field(
        sa_column=Column(PG_UUID(as_uuid=True), nullable=False, index=True),
    )
    actor_id: UUID | None = Field(
        default=None,
        sa_column=Column(PG_UUID(as_uuid=True), nullable=True, index=True),
    )
    type: str = Field(
        sa_column=Column(String(length=32), nullable=False),
    )
    title: str = Field(
        sa_column=Column(String(length=255), nullable=False),
    )
    message: str = Field(
        sa_column=Column(String(length=2000), nullable=False),
    )
    link_url: str = Field(
        sa_column=Column(String(length=500), nullable=False),
    )
    metadata_json: dict[str, Any] = Field(
        default_factory=dict,
        sa_column=Column(JSONB, nullable=True),
    )
    read_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True, index=True),
    )
    created_at: datetime = Field(
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )

    def to_domain(self) -> Notification:
        return Notification(
            id=self.id,
            user_id=self.user_id,
            organization_id=self.organization_id,
            actor_id=self.actor_id,
            type=NotificationType(self.type),
            title=self.title,
            message=self.message,
            link_url=self.link_url,
            metadata_json=self.metadata_json or {},
            read_at=self.read_at,
            created_at=self.created_at,
        )

    @classmethod
    def from_domain(cls, entity: Notification) -> "NotificationTable":
        return cls(
            id=entity.id,
            user_id=entity.user_id,
            organization_id=entity.organization_id,
            actor_id=entity.actor_id,
            type=entity.type.value if hasattr(entity.type, "value") else str(entity.type),
            title=entity.title,
            message=entity.message,
            link_url=entity.link_url,
            metadata_json=entity.metadata_json,
            read_at=entity.read_at,
            created_at=entity.created_at,
        )
