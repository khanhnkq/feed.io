from collections.abc import Callable
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Header, status

from feedio.modules.projects.application.commands.create_project import CreateProject
from feedio.modules.projects.application.ports import ProjectRepository
from feedio.modules.projects.application.queries.list_projects import ListProjects
from feedio.modules.projects.presentation.schemas import CreateProjectRequest, ProjectResponse

RepositoryProvider = Callable[..., ProjectRepository]


def create_projects_router(repository_provider: RepositoryProvider) -> APIRouter:
    router = APIRouter(prefix="/projects", tags=["projects"])

    @router.get("", operation_id="list_projects")
    async def list_projects(
        organization_id: Annotated[UUID, Header(alias="X-Organization-Id")],
        repository: Annotated[ProjectRepository, Depends(repository_provider)],
    ) -> list[ProjectResponse]:
        projects = await ListProjects(repository).execute(organization_id)
        return [ProjectResponse.from_domain(project) for project in projects]

    @router.post("", status_code=status.HTTP_201_CREATED, operation_id="create_project")
    async def create_project(
        payload: CreateProjectRequest,
        organization_id: Annotated[UUID, Header(alias="X-Organization-Id")],
        repository: Annotated[ProjectRepository, Depends(repository_provider)],
    ) -> ProjectResponse:
        project = await CreateProject(repository).execute(
            organization_id=organization_id,
            name=payload.name,
            description=payload.description,
        )
        return ProjectResponse.from_domain(project)

    return router
