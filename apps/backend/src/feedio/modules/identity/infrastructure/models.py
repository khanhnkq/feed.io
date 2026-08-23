from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import CheckConstraint, Column, DateTime, String, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import CITEXT
from sqlmodel import Field, SQLModel

from feedio.shared.infrastructure.persistence import utc_now


class UserTable(SQLModel, table=True):
    __tablename__ = "users"
    __table_args__ = (
        UniqueConstraint("keycloak_subject", name="uq_users_keycloak_subject"),
        UniqueConstraint("email", name="uq_users_email"),
        CheckConstraint("status IN ('active', 'disabled')", name="ck_users_status"),
    )

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    keycloak_subject: str = Field(sa_column=Column(String(255), nullable=False))
    email: str = Field(sa_column=Column(CITEXT(), nullable=False))
    display_name: str = Field(sa_column=Column(String(120), nullable=False))
    avatar_url: str | None = Field(
        default=None,
        sa_column=Column(String(2048), nullable=True),
    )
    status: str = Field(default="active", sa_column=Column(String(20), nullable=False))
    created_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(
            DateTime(timezone=True),
            nullable=False,
            server_default=func.now(),
        ),
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
