"""Move workspace creation from registration to authenticated onboarding."""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260823_0004"
down_revision: str | None = "20260823_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_column("users", "pending_workspace_name")


def downgrade() -> None:
    op.add_column(
        "users",
        sa.Column("pending_workspace_name", sa.String(length=120), nullable=True),
    )
