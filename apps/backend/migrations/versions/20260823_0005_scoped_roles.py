"""Add platform_role to users and rename organization_members.role to organization_role."""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260823_0005"
down_revision: str | None = "20260823_0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    add_platform_role()
    rename_organization_member_role()


def add_platform_role() -> None:
    op.add_column(
        "users",
        sa.Column(
            "platform_role",
            sa.String(length=20),
            server_default="user",
            nullable=False,
        ),
    )
    op.create_check_constraint(
        "ck_users_platform_role",
        "users",
        "platform_role IN ('user', 'support', 'super_admin')",
    )


def rename_organization_member_role() -> None:
    op.alter_column(
        "organization_members",
        "role",
        new_column_name="organization_role",
    )
    op.drop_constraint(
        "ck_organization_members_role",
        "organization_members",
        type_="check",
    )
    op.create_check_constraint(
        "ck_organization_members_organization_role",
        "organization_members",
        "organization_role IN ('owner', 'admin', 'member')",
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_organization_members_organization_role",
        "organization_members",
        type_="check",
    )
    op.alter_column(
        "organization_members",
        "organization_role",
        new_column_name="role",
    )
    op.create_check_constraint(
        "ck_organization_members_role",
        "organization_members",
        "role IN ('owner', 'admin', 'member')",
    )
    op.drop_constraint("ck_users_platform_role", "users", type_="check")
    op.drop_column("users", "platform_role")
