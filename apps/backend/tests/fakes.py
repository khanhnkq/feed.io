from uuid import UUID

from feedio.modules.projects.domain.entities import Project


class InMemoryProjectRepository:
    def __init__(self) -> None:
        self.projects: list[Project] = []

    async def add(self, project: Project) -> Project:
        self.projects.append(project)
        return project

    async def list_for_organization(self, organization_id: UUID) -> list[Project]:
        return [item for item in self.projects if item.organization_id == organization_id]
