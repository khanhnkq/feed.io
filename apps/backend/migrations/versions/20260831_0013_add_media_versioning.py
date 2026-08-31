"""Add version_group_id and version_number to media_assets table."""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID as PG_UUID

revision: str = "20260831_0013"
down_revision: str | None = "20260831_0012"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "media_assets",
        sa.Column("version_group_id", PG_UUID(as_uuid=True), nullable=True),
    )
    op.add_column(
        "media_assets",
        sa.Column("version_number", sa.Integer(), nullable=False, server_default="1"),
    )
    op.create_index(
        "ix_media_assets_version_group_id",
        "media_assets",
        ["version_group_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_media_assets_version_group_id", table_name="media_assets")
    op.drop_column("media_assets", "version_number")
    op.drop_column("media_assets", "version_group_id")
