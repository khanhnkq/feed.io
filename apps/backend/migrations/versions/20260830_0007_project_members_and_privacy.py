"""Add project privacy and project members table."""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260830_0007"
down_revision: str | None = "20260829_0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Add visibility and created_by_user_id to projects table
    op.add_column(
        "projects",
        sa.Column(
            "visibility",
            sa.String(length=20),
            server_default="public",
            nullable=False,
        ),
    )
    op.add_column(
        "projects",
        sa.Column(
            "created_by_user_id",
            postgresql.UUID(as_uuid=True),
            nullable=True,
        ),
    )
    op.create_foreign_key(
        "fk_projects_created_by_user_id",
        "projects",
        "users",
        ["created_by_user_id"],
        ["id"],
        ondelete="SET NULL",
    )

    # 2. Create project_members table
    op.create_table(
        "project_members",
        sa.Column("project_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            "project_role",
            sa.String(length=20),
            server_default="editor",
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("project_id", "user_id"),
        sa.ForeignKeyConstraint(
            ["project_id"],
            ["projects.id"],
            name="fk_project_members_project_id",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name="fk_project_members_user_id",
            ondelete="CASCADE",
        ),
        sa.UniqueConstraint(
            "project_id",
            "user_id",
            name="uq_project_members_project_user",
        ),
    )
    op.create_index(
        "ix_project_members_user_project",
        "project_members",
        ["user_id", "project_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_project_members_user_project", table_name="project_members")
    op.drop_table("project_members")
    op.drop_constraint("fk_projects_created_by_user_id", "projects", type_="foreignkey")
    op.drop_column("projects", "created_by_user_id")
    op.drop_column("projects", "visibility")
