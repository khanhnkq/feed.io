from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import Column, DateTime, Index, UniqueConstraint, func, text
from sqlalchemy.dialects.postgresql import CITEXT
from sqlmodel import Field, SQLModel

from feedio.shared.infrastructure.persistence import utc_now


class ProjectTable(SQLModel, table=True):
    __tablename__ = "projects"
    __table_args__ = (
        UniqueConstraint(
            "organization_id",
            "id",
            name="uq_projects_organization_id_id",
        ),
        Index("ix_projects_organization_created", "organization_id", "created_at", "id"),
    )

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    organization_id: UUID = Field(
        foreign_key="organizations.id",
        ondelete="RESTRICT",
    )
    name: str = Field(max_length=120)
    description: str = Field(default="", max_length=500)
    created_at: datetime = Field(
        default_factory=utc_now,
        sa_column=Column(DateTime(timezone=True), nullable=False),
    )


class FolderTable(SQLModel, table=True):
    __tablename__ = "folders"
    __table_args__ = (
        UniqueConstraint(
            "organization_id",
            "id",
            name="uq_folders_organization_id_id",
        ),
        Index(
            "uq_folders_project_parent_name_active",
            "project_id",
            "parent_id",
            "name",
            unique=True,
            postgresql_where=text("deleted_at IS NULL"),
        ),
        Index(
            "ix_folders_project_parent_active",
            "organization_id",
            "project_id",
            "parent_id",
            postgresql_where=text("deleted_at IS NULL"),
        ),
    )

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    organization_id: UUID = Field(
        foreign_key="organizations.id",
        ondelete="RESTRICT",
    )
    project_id: UUID = Field(
        foreign_key="projects.id",
        ondelete="RESTRICT",
    )
    parent_id: UUID | None = Field(
        default=None,
        foreign_key="folders.id",
        ondelete="RESTRICT",
    )
    name: str = Field(sa_column=Column(CITEXT(), nullable=False))
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
