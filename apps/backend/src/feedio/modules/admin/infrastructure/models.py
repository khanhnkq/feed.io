from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import Column, DateTime, Index, String, Text, func
from sqlmodel import Field, SQLModel

from feedio.shared.infrastructure.persistence import utc_now


class AuditLogTable(SQLModel, table=True):
    __tablename__ = "audit_logs"
    __table_args__ = (
        Index("ix_audit_logs_timestamp", "timestamp"),
        Index("ix_audit_logs_action", "action"),
        Index("ix_audit_logs_actor_email", "actor_email"),
        Index("ix_audit_logs_target_type", "target_type"),
    )

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    timestamp: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(DateTime(timezone=True), nullable=False, server_default=func.now()),
    )
    actor_email: str = Field(sa_column=Column(String(255), nullable=False))
    actor_role: str = Field(
        default="user",
        sa_column=Column(String(32), nullable=False, server_default="user"),
    )
    action: str = Field(sa_column=Column(String(64), nullable=False))
    target_type: str = Field(
        default="system",
        sa_column=Column(String(32), nullable=False, server_default="system"),
    )
    target_name: str = Field(sa_column=Column(String(255), nullable=False))
    details: str = Field(
        default="",
        sa_column=Column(Text, nullable=False, server_default=""),
    )
    ip_address: str = Field(
        default="127.0.0.1",
        sa_column=Column(String(64), nullable=False, server_default="127.0.0.1"),
    )
    status: str = Field(
        default="success",
        sa_column=Column(String(20), nullable=False, server_default="success"),
    )
