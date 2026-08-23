from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlalchemy import Index
from sqlmodel import Field, SQLModel


class ProjectTable(SQLModel, table=True):
    __tablename__ = "projects"
    __table_args__ = (
        Index("ix_projects_organization_created", "organization_id", "created_at", "id"),
    )

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    organization_id: UUID = Field(index=True)
    name: str = Field(max_length=120)
    description: str = Field(default="", max_length=500)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
