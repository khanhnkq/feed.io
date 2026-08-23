from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint, Column, DateTime, Index, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import CITEXT
from sqlmodel import Field, SQLModel

from feedio.shared.infrastructure.persistence import utc_now


class UserTable(SQLModel, table=True):
    __tablename__ = "users"
    __table_args__ = (
        UniqueConstraint("email", name="uq_users_email"),
        CheckConstraint(
            "status IN ('pending_verification', 'active', 'disabled')",
            name="ck_users_status",
        ),
    )

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    email: str = Field(sa_column=Column(CITEXT(), nullable=False))
    password_hash: str = Field(sa_column=Column(String(255), nullable=False))
    display_name: str = Field(sa_column=Column(String(120), nullable=False))
    avatar_url: str | None = Field(default=None, sa_column=Column(String(2048), nullable=True))
    status: str = Field(
        default="pending_verification",
        sa_column=Column(String(24), nullable=False),
    )
    email_verified_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )
    created_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(DateTime(timezone=True), nullable=False, server_default=func.now()),
    )
    updated_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(
            DateTime(timezone=True),
            nullable=False,
            server_default=func.now(),
            onupdate=func.now(),
        ),
    )


class AuthSessionTable(SQLModel, table=True):
    __tablename__ = "auth_sessions"
    __table_args__ = (
        UniqueConstraint("refresh_token_hash", name="uq_auth_sessions_refresh_token_hash"),
        Index("ix_auth_sessions_user_active", "user_id", "revoked_at", "expires_at"),
    )

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="users.id", ondelete="CASCADE")
    refresh_token_hash: str = Field(sa_column=Column(String(64), nullable=False))
    user_agent: str | None = Field(default=None, sa_column=Column(String(512), nullable=True))
    ip_address: str | None = Field(default=None, sa_column=Column(String(64), nullable=True))
    expires_at: datetime = Field(sa_column=Column(DateTime(timezone=True), nullable=False))
    last_used_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(DateTime(timezone=True), nullable=False, server_default=func.now()),
    )
    revoked_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )
    created_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(DateTime(timezone=True), nullable=False, server_default=func.now()),
    )


class AuthActionTokenTable(SQLModel, table=True):
    __tablename__ = "auth_action_tokens"
    __table_args__ = (
        UniqueConstraint("token_hash", name="uq_auth_action_tokens_token_hash"),
        CheckConstraint(
            "purpose IN ('verify_email', 'reset_password')",
            name="ck_auth_action_tokens_purpose",
        ),
        Index("ix_auth_action_tokens_user_purpose", "user_id", "purpose", "consumed_at"),
        Index("ix_auth_action_tokens_expiry", "expires_at"),
    )

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(foreign_key="users.id", ondelete="CASCADE")
    purpose: str = Field(sa_column=Column(String(24), nullable=False))
    token_hash: str = Field(sa_column=Column(String(64), nullable=False))
    expires_at: datetime = Field(sa_column=Column(DateTime(timezone=True), nullable=False))
    consumed_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )
    created_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(DateTime(timezone=True), nullable=False, server_default=func.now()),
    )
