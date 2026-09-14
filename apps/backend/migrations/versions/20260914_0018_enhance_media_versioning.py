"""Enhance media versioning with version_label and is_primary_version."""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260914_0018"
down_revision: str | None = "20260914_0017"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "media_assets",
        sa.Column("version_label", sa.String(100), nullable=True),
    )
    op.add_column(
        "media_assets",
        sa.Column(
            "is_primary_version",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
    )
    op.execute(
        "UPDATE media_assets SET is_primary_version = TRUE WHERE is_primary_version IS FALSE"
    )
    op.create_index(
        "ix_media_assets_version_group_number",
        "media_assets",
        ["version_group_id", "version_number"],
        postgresql_where=sa.text("deleted_at IS NULL"),
    )
    op.create_index(
        "ix_media_assets_primary_version",
        "media_assets",
        ["organization_id", "project_id", "is_primary_version"],
        postgresql_where=sa.text("deleted_at IS NULL"),
    )


def downgrade() -> None:
    op.drop_index("ix_media_assets_primary_version", table_name="media_assets")
    op.drop_index("ix_media_assets_version_group_number", table_name="media_assets")
    op.drop_column("media_assets", "is_primary_version")
    op.drop_column("media_assets", "version_label")
