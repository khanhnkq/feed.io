from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import UUID, uuid4

from feedio.modules.projects.domain.errors import (
    InvalidFolderNameError,
    InvalidProjectNameError,
)


@dataclass(frozen=True, slots=True)
class Project:
    id: UUID
    organization_id: UUID
    name: str
    description: str
    created_at: datetime
    visibility: str = "public"

    @classmethod
    def create(
        cls,
        organization_id: UUID,
        name: str,
        description: str = "",
        visibility: str = "public",
    ) -> "Project":
        normalized_name = name.strip()
        if not normalized_name or len(normalized_name) > 120:
            raise InvalidProjectNameError("Project name must contain 1 to 120 characters")
        valid_visibility = "private" if visibility.strip().lower() == "private" else "public"
        return cls(
            id=uuid4(),
            organization_id=organization_id,
            name=normalized_name,
            description=description.strip(),
            created_at=datetime.now(UTC),
            visibility=valid_visibility,
        )

    def update(
        self,
        name: str | None = None,
        description: str | None = None,
        visibility: str | None = None,
    ) -> "Project":
        new_name = self.name
        if name is not None:
            normalized_name = name.strip()
            if not normalized_name or len(normalized_name) > 120:
                raise InvalidProjectNameError("Project name must contain 1 to 120 characters")
            new_name = normalized_name
        new_description = self.description if description is None else description.strip()
        new_visibility = self.visibility
        if visibility is not None:
            new_visibility = "private" if visibility.strip().lower() == "private" else "public"
        return Project(
            id=self.id,
            organization_id=self.organization_id,
            name=new_name,
            description=new_description,
            created_at=self.created_at,
            visibility=new_visibility,
        )


@dataclass(frozen=True, slots=True)
class ProjectMember:
    project_id: UUID
    user_id: UUID
    project_role: str  # "editor" | "viewer"
    email: str
    display_name: str
    created_at: datetime


@dataclass(frozen=True, slots=True)
class BreadcrumbItem:
    id: UUID
    name: str


@dataclass(frozen=True, slots=True)
class Folder:
    id: UUID
    organization_id: UUID
    project_id: UUID
    parent_id: UUID | None
    name: str
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None = None

    @classmethod
    def create(
        cls,
        organization_id: UUID,
        project_id: UUID,
        name: str,
        parent_id: UUID | None = None,
    ) -> "Folder":
        normalized_name = name.strip()
        if not normalized_name or len(normalized_name) > 120:
            raise InvalidFolderNameError("Folder name must contain 1 to 120 characters")
        now = datetime.now(UTC)
        return cls(
            id=uuid4(),
            organization_id=organization_id,
            project_id=project_id,
            parent_id=parent_id,
            name=normalized_name,
            created_at=now,
            updated_at=now,
            deleted_at=None,
        )
