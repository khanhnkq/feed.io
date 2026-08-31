"""Add transcode fields to media_assets table."""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260830_0010"
down_revision: str | None = "20260830_0009"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "media_assets",
        sa.Column("fps", sa.Float(), nullable=True),
    )
    op.add_column(
        "media_assets",
        sa.Column("hls_storage_key", sa.String(length=500), nullable=True),
    )
    op.add_column(
        "media_assets",
        sa.Column("waveform_data", sa.Text(), nullable=True),
    )
    op.add_column(
        "media_assets",
        sa.Column("error_message", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("media_assets", "error_message")
    op.drop_column("media_assets", "waveform_data")
    op.drop_column("media_assets", "hls_storage_key")
    op.drop_column("media_assets", "fps")
