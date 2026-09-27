"""Create subscriptions, subscription_events tables and add plan quotas to organizations.

Revision ID: 20260927_0021
Revises: 20260927_0020
Create Date: 2026-09-27
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260927_0021"
down_revision: str | None = "20260927_0020"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Add plan_tier and storage_quota_bytes to organizations
    op.add_column(
        "organizations",
        sa.Column(
            "plan_tier",
            sa.String(length=32),
            nullable=False,
            server_default="free",
        ),
    )
    op.add_column(
        "organizations",
        sa.Column(
            "storage_quota_bytes",
            sa.BigInteger(),
            nullable=False,
            server_default="5368709120",
        ),
    )
    op.create_check_constraint(
        "ck_organizations_plan_tier",
        "organizations",
        "plan_tier IN ('free', 'pro_100gb', 'pro_500gb', 'pro_1tb', 'enterprise')",
    )
    op.create_check_constraint(
        "ck_organizations_storage_quota_positive",
        "organizations",
        "storage_quota_bytes > 0",
    )
    op.create_index(
        "ix_organizations_plan_tier",
        "organizations",
        ["plan_tier"],
    )

    # 2. Create subscriptions table
    op.create_table(
        "subscriptions",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("provider", sa.String(length=32), nullable=False, server_default="stripe"),
        sa.Column("provider_customer_id", sa.String(length=255), nullable=True),
        sa.Column("provider_subscription_id", sa.String(length=255), nullable=True),
        sa.Column("provider_price_id", sa.String(length=255), nullable=True),
        sa.Column("plan_tier", sa.String(length=32), nullable=False, server_default="free"),
        sa.Column(
            "billing_interval",
            sa.String(length=16),
            nullable=False,
            server_default="monthly",
        ),
        sa.Column(
            "storage_quota_bytes",
            sa.BigInteger(),
            nullable=False,
            server_default="5368709120",
        ),
        sa.Column("max_members", sa.Integer(), nullable=True, server_default="5"),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="active"),
        sa.Column("current_period_start", sa.DateTime(timezone=True), nullable=True),
        sa.Column("current_period_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "cancel_at_period_end",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column("canceled_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("trial_start", sa.DateTime(timezone=True), nullable=True),
        sa.Column("trial_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint("organization_id", name="uq_subscriptions_organization_id"),
        sa.CheckConstraint(
            "plan_tier IN ('free', 'pro_100gb', 'pro_500gb', 'pro_1tb', 'enterprise')",
            name="ck_subscriptions_plan_tier",
        ),
        sa.CheckConstraint(
            "billing_interval IN ('monthly', 'yearly')",
            name="ck_subscriptions_billing_interval",
        ),
        sa.CheckConstraint(
            "status IN ('active', 'trialing', 'past_due', 'canceled', 'incomplete', 'incomplete_expired')",
            name="ck_subscriptions_status",
        ),
        sa.CheckConstraint(
            "storage_quota_bytes > 0",
            name="ck_subscriptions_storage_quota_positive",
        ),
    )
    op.create_index(
        "ix_subscriptions_provider_sub_id",
        "subscriptions",
        ["provider_subscription_id"],
        postgresql_where=sa.text("provider_subscription_id IS NOT NULL"),
    )
    op.create_index(
        "ix_subscriptions_customer_id",
        "subscriptions",
        ["provider_customer_id"],
        postgresql_where=sa.text("provider_customer_id IS NOT NULL"),
    )
    op.create_index("ix_subscriptions_status", "subscriptions", ["status"])

    # 3. Create subscription_events table
    op.create_table(
        "subscription_events",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "organization_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("organizations.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("provider", sa.String(length=32), nullable=False, server_default="stripe"),
        sa.Column("event_id", sa.String(length=255), nullable=False),
        sa.Column("event_type", sa.String(length=100), nullable=False),
        sa.Column("payload", postgresql.JSONB(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="processed"),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column(
            "processed_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.func.now(),
        ),
        sa.UniqueConstraint("provider", "event_id", name="uq_subscription_events_provider_event_id"),
        sa.CheckConstraint(
            "status IN ('processed', 'ignored', 'failed')",
            name="ck_subscription_events_status",
        ),
    )
    op.create_index("ix_subscription_events_org_id", "subscription_events", ["organization_id"])
    op.create_index("ix_subscription_events_event_type", "subscription_events", ["event_type"])

    # 4. Data Backfill: create a default 'free' subscription for existing organizations
    op.execute(
        """
        INSERT INTO subscriptions (
            id, organization_id, provider, plan_tier, billing_interval,
            storage_quota_bytes, max_members, status, created_at, updated_at
        )
        SELECT
            gen_random_uuid(), id, 'feedi_internal', 'free', 'monthly',
            5368709120, 5, 'active', NOW(), NOW()
        FROM organizations
        ON CONFLICT (organization_id) DO NOTHING;
        """
    )


def downgrade() -> None:
    # 1. Drop subscription_events table
    op.drop_index("ix_subscription_events_event_type", table_name="subscription_events")
    op.drop_index("ix_subscription_events_org_id", table_name="subscription_events")
    op.drop_table("subscription_events")

    # 2. Drop subscriptions table
    op.drop_index("ix_subscriptions_status", table_name="subscriptions")
    op.drop_index("ix_subscriptions_customer_id", table_name="subscriptions")
    op.drop_index("ix_subscriptions_provider_sub_id", table_name="subscriptions")
    op.drop_table("subscriptions")

    # 3. Revert organizations table columns and constraints
    op.drop_index("ix_organizations_plan_tier", table_name="organizations")
    op.drop_constraint("ck_organizations_storage_quota_positive", "organizations", type_="check")
    op.drop_constraint("ck_organizations_plan_tier", "organizations", type_="check")
    op.drop_column("organizations", "storage_quota_bytes")
    op.drop_column("organizations", "plan_tier")
