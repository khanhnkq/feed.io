"""Replace Keycloak identity fields with self-hosted SaaS authentication."""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260823_0003"
down_revision: str | None = "20260823_0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    migrate_users()
    create_auth_sessions()
    create_auth_action_tokens()


def migrate_users() -> None:
    op.drop_constraint("ck_users_status", "users", type_="check")
    op.add_column("users", sa.Column("password_hash", sa.String(length=255), nullable=True))
    op.add_column(
        "users",
        sa.Column("pending_workspace_name", sa.String(length=120), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("email_verified_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.execute(
        "UPDATE users SET password_hash = 'migration-disabled-no-password', "
        "status = 'disabled', email_verified_at = now()"
    )
    op.alter_column("users", "password_hash", nullable=False)
    op.create_check_constraint(
        "ck_users_status",
        "users",
        "status IN ('pending_verification', 'active', 'disabled')",
    )
    op.drop_constraint("uq_users_keycloak_subject", "users", type_="unique")
    op.drop_column("users", "keycloak_subject")


def create_auth_sessions() -> None:
    op.create_table(
        "auth_sessions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("refresh_token_hash", sa.String(length=64), nullable=False),
        sa.Column("user_agent", sa.String(length=512), nullable=True),
        sa.Column("ip_address", sa.String(length=64), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column(
            "last_used_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "refresh_token_hash",
            name="uq_auth_sessions_refresh_token_hash",
        ),
    )
    op.create_index(
        "ix_auth_sessions_user_active",
        "auth_sessions",
        ["user_id", "revoked_at", "expires_at"],
    )


def create_auth_action_tokens() -> None:
    op.create_table(
        "auth_action_tokens",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("purpose", sa.String(length=24), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.CheckConstraint(
            "purpose IN ('verify_email', 'reset_password')",
            name="ck_auth_action_tokens_purpose",
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash", name="uq_auth_action_tokens_token_hash"),
    )
    op.create_index(
        "ix_auth_action_tokens_user_purpose",
        "auth_action_tokens",
        ["user_id", "purpose", "consumed_at"],
    )
    op.create_index(
        "ix_auth_action_tokens_expiry",
        "auth_action_tokens",
        ["expires_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_auth_action_tokens_expiry", table_name="auth_action_tokens")
    op.drop_index("ix_auth_action_tokens_user_purpose", table_name="auth_action_tokens")
    op.drop_table("auth_action_tokens")
    op.drop_index("ix_auth_sessions_user_active", table_name="auth_sessions")
    op.drop_table("auth_sessions")
    op.add_column("users", sa.Column("keycloak_subject", sa.String(length=255), nullable=True))
    op.execute("UPDATE users SET keycloak_subject = 'legacy-' || id::text")
    op.alter_column("users", "keycloak_subject", nullable=False)
    op.create_unique_constraint("uq_users_keycloak_subject", "users", ["keycloak_subject"])
    op.drop_constraint("ck_users_status", "users", type_="check")
    op.execute("UPDATE users SET status = 'disabled' WHERE status = 'pending_verification'")
    op.create_check_constraint("ck_users_status", "users", "status IN ('active', 'disabled')")
    op.drop_column("users", "email_verified_at")
    op.drop_column("users", "pending_workspace_name")
    op.drop_column("users", "password_hash")
