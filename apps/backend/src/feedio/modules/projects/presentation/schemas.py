from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from feedio.modules.projects.domain.entities import Project


class CreateProjectRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str = Field(default="", max_length=500)


class ProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    organization_id: UUID
    name: str
    description: str
    created_at: datetime

    @classmethod
    def from_domain(cls, project: Project) -> "ProjectResponse":
        return cls.model_validate(project)
