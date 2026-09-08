"""Add review decisions and media status.

Revision ID: 20260831_0015
Revises: 20260831_0014
Create Date: 2026-08-31
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID as PG_UUID

revision: str = "20260831_0015"
down_revision: str | None = "20260831_0014"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Add review status fields to media_assets
    op.add_column(
        "media_assets",
        sa.Column(
            "review_status",
            sa.String(length=30),
            nullable=False,
            server_default="pending",
        ),
    )
    op.add_column(
        "media_assets",
        sa.Column(
            "reviewed_by_user_id",
            PG_UUID(as_uuid=True),
            nullable=True,
        ),
    )
    op.add_column(
        "media_assets",
        sa.Column(
            "reviewed_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )
    op.create_index(
        "ix_media_assets_project_review_status",
        "media_assets",
        ["project_id", "review_status"],
    )

    # 2. Create media_review_decisions audit table
    op.create_table(
        "media_review_decisions",
        sa.Column("id", PG_UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", PG_UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("project_id", PG_UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("media_id", PG_UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("user_id", PG_UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("status", sa.String(length=30), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(
        "ix_media_review_decisions_media_created",
        "media_review_decisions",
        ["media_id", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_media_review_decisions_media_created", table_name="media_review_decisions")
    op.drop_table("media_review_decisions")
    op.drop_index("ix_media_assets_project_review_status", table_name="media_assets")
    op.drop_column("media_assets", "reviewed_at")
    op.drop_column("media_assets", "reviewed_by_user_id")
    op.drop_column("media_assets", "review_status")
