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

    @classmethod
    def create(cls, organization_id: UUID, name: str, description: str = "") -> "Project":
        normalized_name = name.strip()
        if not normalized_name or len(normalized_name) > 120:
            raise InvalidProjectNameError("Project name must contain 1 to 120 characters")
        return cls(
            id=uuid4(),
            organization_id=organization_id,
            name=normalized_name,
            description=description.strip(),
            created_at=datetime.now(UTC),
        )


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
