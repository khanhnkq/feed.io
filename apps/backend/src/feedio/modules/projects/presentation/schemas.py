from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from feedio.modules.projects.domain.entities import (
    BreadcrumbItem,
    Folder,
    Project,
    ProjectMember,
)


class CreateProjectRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    description: str = Field(default="", max_length=500)
    visibility: str = Field(default="public", pattern=r"^(public|private)$")


class UpdateProjectRequest(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    description: str | None = Field(default=None, max_length=500)
    visibility: str | None = Field(default=None, pattern=r"^(public|private)$")


class ProjectResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    organization_id: UUID
    name: str
    description: str
    visibility: str = "public"
    created_at: datetime

    @classmethod
    def from_domain(cls, project: Project) -> "ProjectResponse":
        return cls.model_validate(project)


class AddProjectMemberRequest(BaseModel):
    user_id: UUID
    project_role: str = Field(default="editor", pattern=r"^(editor|viewer)$")


class UpdateProjectMemberRoleRequest(BaseModel):
    project_role: str = Field(pattern=r"^(editor|viewer)$")


class ProjectMemberResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    project_id: UUID
    user_id: UUID
    project_role: str
    email: str
    display_name: str
    created_at: datetime

    @classmethod
    def from_domain(cls, member: ProjectMember) -> "ProjectMemberResponse":
        return cls.model_validate(member)


class CreateFolderRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    parent_id: UUID | None = None


class RenameFolderRequest(BaseModel):
    name: str = Field(min_length=1, max_length=120)


class MoveFolderRequest(BaseModel):
    new_parent_id: UUID | None = None


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
