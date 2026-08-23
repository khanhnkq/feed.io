"""Create identity and organization tenancy tables."""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260823_0002"
down_revision: str | None = "20260823_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS citext")
    create_users_table()
    create_organizations_table()
    create_membership_table()
    create_invitation_table()
    attach_existing_projects()


def create_users_table() -> None:
    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("keycloak_subject", sa.String(length=255), nullable=False),
        sa.Column("email", postgresql.CITEXT(), nullable=False),
        sa.Column("display_name", sa.String(length=120), nullable=False),
        sa.Column("avatar_url", sa.String(length=2048), nullable=True),
        sa.Column("status", sa.String(length=20), server_default="active", nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint("status IN ('active', 'disabled')", name="ck_users_status"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email", name="uq_users_email"),
        sa.UniqueConstraint("keycloak_subject", name="uq_users_keycloak_subject"),
    )


def create_organizations_table() -> None:
    op.create_table(
        "organizations",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("slug", postgresql.CITEXT(), nullable=False),
        sa.Column("status", sa.String(length=20), server_default="active", nullable=False),
        sa.Column("created_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "status IN ('active', 'suspended')",
            name="ck_organizations_status",
        ),
        sa.ForeignKeyConstraint(
            ["created_by_user_id"],
            ["users.id"],
            name="fk_organizations_created_by_user_id_users",
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "uq_organizations_slug_active",
        "organizations",
        ["slug"],
        unique=True,
        postgresql_where=sa.text("deleted_at IS NULL"),
    )


def create_membership_table() -> None:
    op.create_table(
        "organization_members",
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("status", sa.String(length=20), server_default="active", nullable=False),
        sa.Column(
            "joined_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.CheckConstraint(
            "role IN ('owner', 'admin', 'member')",
            name="ck_organization_members_role",
        ),
        sa.CheckConstraint(
            "status IN ('active', 'suspended')",
            name="ck_organization_members_status",
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name="fk_organization_members_organization_id_organizations",
            ondelete="RESTRICT",
        ),
        sa.ForeignKeyConstraint(
            ["user_id"],
            ["users.id"],
            name="fk_organization_members_user_id_users",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("organization_id", "user_id"),
    )
    op.create_index(
        "ix_organization_members_user_status",
        "organization_members",
        ["user_id", "status", "organization_id"],
    )


def create_invitation_table() -> None:
    op.create_table(
        "organization_invitations",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("organization_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("email", postgresql.CITEXT(), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("invited_by_user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.CheckConstraint(
            "expires_at > created_at",
            name="ck_organization_invitations_expiry",
        ),
        sa.CheckConstraint(
            "role IN ('owner', 'admin', 'member')",
            name="ck_organization_invitations_role",
        ),
        sa.CheckConstraint(
            "NOT (accepted_at IS NOT NULL AND revoked_at IS NOT NULL)",
            name="ck_organization_invitations_terminal_state",
        ),
        sa.ForeignKeyConstraint(
            ["invited_by_user_id"],
            ["users.id"],
            name="fk_organization_invitations_invited_by_user_id_users",
            ondelete="SET NULL",
        ),
        sa.ForeignKeyConstraint(
            ["organization_id"],
            ["organizations.id"],
            name="fk_organization_invitations_organization_id_organizations",
            ondelete="RESTRICT",
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "token_hash",
            name="uq_organization_invitations_token_hash",
        ),
    )
    op.create_index(
        "ix_organization_invitations_expiry",
        "organization_invitations",
        ["expires_at"],
    )
    op.create_index(
        "uq_organization_invitations_active_email",
        "organization_invitations",
        ["organization_id", "email"],
        unique=True,
        postgresql_where=sa.text("accepted_at IS NULL AND revoked_at IS NULL"),
    )


def attach_existing_projects() -> None:
    op.execute(
        """
        INSERT INTO organizations (id, name, slug, status, created_at, updated_at)
        SELECT DISTINCT
            organization_id,
            'Imported organization ' || left(organization_id::text, 8),
            'imported-' || replace(organization_id::text, '-', ''),
            'active',
            now(),
            now()
        FROM projects
        ON CONFLICT (id) DO NOTHING
        """
    )
    op.create_unique_constraint(
        "uq_projects_organization_id_id",
        "projects",
        ["organization_id", "id"],
    )
    op.create_foreign_key(
        "fk_projects_organization_id_organizations",
        "projects",
        "organizations",
        ["organization_id"],
        ["id"],
        ondelete="RESTRICT",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_projects_organization_id_organizations",
        "projects",
        type_="foreignkey",
    )
    op.drop_constraint(
        "uq_projects_organization_id_id",
        "projects",
        type_="unique",
    )
    op.drop_index(
        "uq_organization_invitations_active_email",
        table_name="organization_invitations",
    )
    op.drop_index(
        "ix_organization_invitations_expiry",
        table_name="organization_invitations",
    )
    op.drop_table("organization_invitations")
    op.drop_index(
        "ix_organization_members_user_status",
        table_name="organization_members",
    )
    op.drop_table("organization_members")
    op.drop_index("uq_organizations_slug_active", table_name="organizations")
    op.drop_table("organizations")
    op.drop_table("users")
    op.execute("DROP EXTENSION IF EXISTS citext")
