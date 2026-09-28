"""Create audit_logs table for platform administrative security events.

Revision ID: 20260928_0022
Revises: 20260927_0021
Create Date: 2026-09-28
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260928_0022"
down_revision: str | None = "20260927_0021"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "audit_logs",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column(
            "timestamp",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("actor_email", sa.String(length=255), nullable=False),
        sa.Column(
            "actor_role",
            sa.String(length=32),
            nullable=False,
            server_default="user",
        ),
        sa.Column("action", sa.String(length=64), nullable=False),
        sa.Column(
            "target_type",
            sa.String(length=32),
            nullable=False,
            server_default="system",
        ),
        sa.Column("target_name", sa.String(length=255), nullable=False),
        sa.Column("details", sa.Text(), nullable=False, server_default=""),
        sa.Column(
            "ip_address",
            sa.String(length=64),
            nullable=False,
            server_default="127.0.0.1",
        ),
        sa.Column(
            "status",
            sa.String(length=20),
            nullable=False,
            server_default="success",
        ),
    )
    op.create_index("ix_audit_logs_timestamp", "audit_logs", ["timestamp"])
    op.create_index("ix_audit_logs_action", "audit_logs", ["action"])
    op.create_index("ix_audit_logs_actor_email", "audit_logs", ["actor_email"])
    op.create_index("ix_audit_logs_target_type", "audit_logs", ["target_type"])


def downgrade() -> None:
    op.drop_index("ix_audit_logs_target_type", table_name="audit_logs")
    op.drop_index("ix_audit_logs_actor_email", table_name="audit_logs")
    op.drop_index("ix_audit_logs_action", table_name="audit_logs")
    op.drop_index("ix_audit_logs_timestamp", table_name="audit_logs")
    op.drop_table("audit_logs")
