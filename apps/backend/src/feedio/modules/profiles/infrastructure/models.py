from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import Column, DateTime, Index, String, UniqueConstraint, func
from sqlmodel import Field, SQLModel

from feedio.shared.infrastructure.persistence import utc_now


class UserProfileTable(SQLModel, table=True):
    __tablename__ = "user_profiles"
    __table_args__ = (
        UniqueConstraint("user_id", name="uq_user_profiles_user_id"),
        Index("ix_user_profiles_user_id", "user_id"),
    )

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(
        foreign_key="users.id",
        ondelete="CASCADE",
        nullable=False,
    )
    display_name: str = Field(sa_column=Column(String(120), nullable=False))
    avatar_url: str | None = Field(default=None, sa_column=Column(String(2048), nullable=True))
    job_title: str | None = Field(default=None, sa_column=Column(String(120), nullable=True))
    timezone: str = Field(
        default="UTC",
        sa_column=Column(String(64), nullable=False, server_default="UTC"),
    )
    locale: str = Field(
        default="en",
        sa_column=Column(String(10), nullable=False, server_default="en"),
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
