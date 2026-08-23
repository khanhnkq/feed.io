from typing import Protocol
from uuid import UUID

from feedio.modules.projects.domain.entities import Project


class ProjectRepository(Protocol):
    async def add(self, project: Project) -> Project: ...

    async def list_for_organization(self, organization_id: UUID) -> list[Project]: ...
