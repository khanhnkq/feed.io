"""Create media_comments table."""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSONB, UUID as PG_UUID

revision: str = "20260831_0012"
down_revision: str | None = "20260831_0011"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "media_comments",
        sa.Column("id", PG_UUID(as_uuid=True), primary_key=True),
        sa.Column("organization_id", PG_UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("project_id", PG_UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("media_id", PG_UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("user_id", PG_UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("parent_comment_id", PG_UUID(as_uuid=True), nullable=True, index=True),
        sa.Column("timestamp_seconds", sa.Float(), nullable=True),
        sa.Column("frame_number", sa.Integer(), nullable=True),
        sa.Column("content", sa.String(length=5000), nullable=False),
        sa.Column("annotation_data", JSONB, nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="open"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_media_comments_lookup",
        "media_comments",
        ["organization_id", "project_id", "media_id", "deleted_at", "timestamp_seconds"],
    )


def downgrade() -> None:
    op.drop_index("ix_media_comments_lookup", table_name="media_comments")
    op.drop_table("media_comments")
