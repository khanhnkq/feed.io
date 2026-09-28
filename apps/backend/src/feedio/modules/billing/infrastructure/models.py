from datetime import datetime
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlmodel import Field, SQLModel

from feedio.shared.infrastructure.persistence import utc_now


class SubscriptionTable(SQLModel, table=True):
    __tablename__ = "subscriptions"
    __table_args__ = (
        UniqueConstraint("organization_id", name="uq_subscriptions_organization_id"),
        CheckConstraint(
            "plan_tier IN ('free', 'pro_100gb', 'pro_500gb', 'pro_1tb', 'enterprise')",
            name="ck_subscriptions_plan_tier",
        ),
        CheckConstraint(
            "billing_interval IN ('monthly', 'yearly')",
            name="ck_subscriptions_billing_interval",
        ),
        CheckConstraint(
            "status IN ('active', 'trialing', 'past_due', 'canceled', "
            "'incomplete', 'incomplete_expired')",
            name="ck_subscriptions_status",
        ),
        CheckConstraint(
            "storage_quota_bytes > 0",
            name="ck_subscriptions_storage_quota_positive",
        ),
        Index(
            "ix_subscriptions_provider_sub_id",
            "provider_subscription_id",
            postgresql_where=text("provider_subscription_id IS NOT NULL"),
        ),
        Index(
            "ix_subscriptions_customer_id",
            "provider_customer_id",
            postgresql_where=text("provider_customer_id IS NOT NULL"),
        ),
        Index("ix_subscriptions_status", "status"),
    )

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    organization_id: UUID = Field(
        foreign_key="organizations.id",
        nullable=False,
        ondelete="CASCADE",
    )
    provider: str = Field(
        default="stripe",
        sa_column=Column(String(32), nullable=False, server_default="stripe"),
    )
    provider_customer_id: str | None = Field(
        default=None,
        sa_column=Column(String(255), nullable=True),
    )
    provider_subscription_id: str | None = Field(
        default=None,
        sa_column=Column(String(255), nullable=True),
    )
    provider_price_id: str | None = Field(
        default=None,
        sa_column=Column(String(255), nullable=True),
    )

    plan_tier: str = Field(
        default="free",
        sa_column=Column(String(32), nullable=False, server_default="free"),
    )
    billing_interval: str = Field(
        default="monthly",
        sa_column=Column(String(16), nullable=False, server_default="monthly"),
    )
    storage_quota_bytes: int = Field(
        default=5368709120,
        sa_column=Column(BigInteger, nullable=False, server_default="5368709120"),
    )
    max_members: int | None = Field(
        default=5,
        sa_column=Column(Integer, nullable=True, server_default="5"),
    )

    status: str = Field(
        default="active",
        sa_column=Column(String(32), nullable=False, server_default="active"),
    )
    current_period_start: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )
    current_period_end: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )
    cancel_at_period_end: bool = Field(
        default=False,
        sa_column=Column(Boolean, nullable=False, server_default=text("false")),
    )
    canceled_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )
    trial_start: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )
    trial_end: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )

    created_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(DateTime(timezone=True), nullable=False, server_default=func.now()),
    )
    updated_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(
            DateTime(timezone=True),
            nullable=False,
            server_default=func.now(),
            onupdate=func.now(),
        ),
    )


class SubscriptionEventTable(SQLModel, table=True):
    __tablename__ = "subscription_events"
    __table_args__ = (
        UniqueConstraint("provider", "event_id", name="uq_subscription_events_provider_event_id"),
        CheckConstraint(
            "status IN ('processed', 'ignored', 'failed')",
            name="ck_subscription_events_status",
        ),
        Index("ix_subscription_events_org_id", "organization_id"),
        Index("ix_subscription_events_event_type", "event_type"),
    )

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    organization_id: UUID | None = Field(
        default=None,
        foreign_key="organizations.id",
        nullable=True,
        ondelete="SET NULL",
    )
    provider: str = Field(
        default="stripe",
        sa_column=Column(String(32), nullable=False, server_default="stripe"),
    )
    event_id: str = Field(sa_column=Column(String(255), nullable=False))
    event_type: str = Field(sa_column=Column(String(100), nullable=False))
    payload: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSONB, nullable=False))
    status: str = Field(
        default="processed",
        sa_column=Column(String(20), nullable=False, server_default="processed"),
    )
    error_message: str | None = Field(default=None, sa_column=Column(Text, nullable=True))
    processed_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(DateTime(timezone=True), nullable=False, server_default=func.now()),
    )
