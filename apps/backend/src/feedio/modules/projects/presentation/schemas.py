from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from feedio.modules.projects.domain.entities import BreadcrumbItem, Folder, Project


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


class CreateFolderRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    parent_id: UUID | None = None


class RenameFolderRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)


class FolderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    organization_id: UUID
    project_id: UUID
    parent_id: UUID | None
    name: str
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_domain(cls, folder: Folder) -> "FolderResponse":
        return cls.model_validate(folder)


class BreadcrumbItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str

    @classmethod
    def from_domain(cls, item: BreadcrumbItem) -> "BreadcrumbItemResponse":
        return cls.model_validate(item)
