"""Add thumbnail_storage_key to media_assets table."""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260830_0009"
down_revision: str | None = "20260830_0008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "media_assets",
        sa.Column("thumbnail_storage_key", sa.String(length=500), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("media_assets", "thumbnail_storage_key")
