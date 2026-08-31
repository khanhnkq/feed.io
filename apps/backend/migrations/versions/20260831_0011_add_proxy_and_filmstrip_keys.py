"""Add proxy and filmstrip storage keys to media_assets table."""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260831_0011"
down_revision: str | None = "20260830_0010"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "media_assets",
        sa.Column("proxy_storage_key", sa.String(length=500), nullable=True),
    )
    op.add_column(
        "media_assets",
        sa.Column("filmstrip_storage_key", sa.String(length=500), nullable=True),
    )
    op.add_column(
        "media_assets",
        sa.Column("filmstrip_vtt_storage_key", sa.String(length=500), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("media_assets", "filmstrip_vtt_storage_key")
    op.drop_column("media_assets", "filmstrip_storage_key")
    op.drop_column("media_assets", "proxy_storage_key")
