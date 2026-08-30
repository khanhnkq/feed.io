import contextlib
from uuid import UUID

from feedio.modules.projects.application.ports import ProjectRepository
from feedio.modules.projects.domain.entities import Project


class CreateProject:
    def __init__(self, repository: ProjectRepository) -> None:
        self._repository = repository

    async def execute(
        self,
        organization_id: UUID,
        name: str,
        description: str = "",
        visibility: str = "public",
        created_by_user_id: UUID | None = None,
    ) -> Project:
        project = Project.create(
            organization_id=organization_id,
            name=name,
            description=description,
            visibility=visibility,
        )
        saved = await self._repository.add(project, created_by_user_id=created_by_user_id)
        if saved.visibility == "private" and created_by_user_id is not None:
            with contextlib.suppress(Exception):
                await self._repository.add_project_member(
                    organization_id=organization_id,
                    project_id=saved.id,
                    user_id=created_by_user_id,
                    project_role="editor",
                )
        return saved
