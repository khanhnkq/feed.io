from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import UUID, uuid4

from feedio.modules.projects.domain.errors import InvalidProjectNameError


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
