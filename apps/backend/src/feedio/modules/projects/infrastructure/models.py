from datetime import datetime
from uuid import UUID, uuid4

from sqlalchemy import Column, DateTime, Index, UniqueConstraint
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
