from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint,
    Column,
    DateTime,
    Index,
    String,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import CITEXT
from sqlmodel import Field, SQLModel

from feedio.shared.infrastructure.persistence import utc_now


class OrganizationTable(SQLModel, table=True):
    __tablename__ = "organizations"
    __table_args__ = (
        CheckConstraint(
            "status IN ('active', 'suspended')",
            name="ck_organizations_status",
        ),
        Index(
            "uq_organizations_slug_active",
            "slug",
            unique=True,
            postgresql_where=text("deleted_at IS NULL"),
        ),
    )

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    name: str = Field(sa_column=Column(String(120), nullable=False))
    slug: str = Field(sa_column=Column(CITEXT(), nullable=False))
    status: str = Field(default="active", sa_column=Column(String(20), nullable=False))
    created_by_user_id: UUID | None = Field(
        default=None,
        foreign_key="users.id",
        ondelete="SET NULL",
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
    deleted_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )


class OrganizationMemberTable(SQLModel, table=True):
    __tablename__ = "organization_members"
    __table_args__ = (
        CheckConstraint(
            "organization_role IN ('owner', 'admin', 'member')",
            name="ck_organization_members_organization_role",
        ),
        CheckConstraint(
            "status IN ('active', 'suspended')",
            name="ck_organization_members_status",
        ),
        Index("ix_organization_members_user_status", "user_id", "status", "organization_id"),
    )

    organization_id: UUID = Field(
        foreign_key="organizations.id",
        ondelete="RESTRICT",
        primary_key=True,
    )
    user_id: UUID = Field(
        foreign_key="users.id",
        ondelete="RESTRICT",
        primary_key=True,
    )
    organization_role: str = Field(sa_column=Column(String(20), nullable=False))
    status: str = Field(default="active", sa_column=Column(String(20), nullable=False))
    joined_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(DateTime(timezone=True), nullable=False, server_default=func.now()),
    )


class OrganizationInvitationTable(SQLModel, table=True):
    __tablename__ = "organization_invitations"
    __table_args__ = (
        UniqueConstraint("token_hash", name="uq_organization_invitations_token_hash"),
        CheckConstraint(
            "role IN ('owner', 'admin', 'member')",
            name="ck_organization_invitations_role",
        ),
        CheckConstraint(
            "expires_at > created_at",
            name="ck_organization_invitations_expiry",
        ),
        CheckConstraint(
            "NOT (accepted_at IS NOT NULL AND revoked_at IS NOT NULL)",
            name="ck_organization_invitations_terminal_state",
        ),
        Index(
            "uq_organization_invitations_active_email",
            "organization_id",
            "email",
            unique=True,
            postgresql_where=text("accepted_at IS NULL AND revoked_at IS NULL"),
        ),
        Index("ix_organization_invitations_expiry", "expires_at"),
    )

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    organization_id: UUID = Field(
        foreign_key="organizations.id",
        ondelete="RESTRICT",
    )
    email: str = Field(sa_column=Column(CITEXT(), nullable=False))
    role: str = Field(sa_column=Column(String(20), nullable=False))
    token_hash: str = Field(sa_column=Column(String(64), nullable=False))
    invited_by_user_id: UUID | None = Field(
        default=None,
        foreign_key="users.id",
        ondelete="SET NULL",
    )
    created_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(DateTime(timezone=True), nullable=False, server_default=func.now()),
    )
    expires_at: datetime = Field(sa_column=Column(DateTime(timezone=True), nullable=False))
    accepted_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )
    revoked_at: datetime | None = Field(
        default=None,
        sa_column=Column(DateTime(timezone=True), nullable=True),
    )
