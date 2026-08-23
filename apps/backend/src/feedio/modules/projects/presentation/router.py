from collections.abc import Callable
from typing import Annotated

from fastapi import APIRouter, Depends, status

from feedio.modules.identity.presentation.dependencies import require_csrf_for_cookie
from feedio.modules.organizations.domain.models import OrganizationContext
from feedio.modules.projects.application.commands.create_project import CreateProject
from feedio.modules.projects.application.ports import ProjectRepository
from feedio.modules.projects.application.queries.list_projects import ListProjects
from feedio.modules.projects.presentation.schemas import CreateProjectRequest, ProjectResponse

RepositoryProvider = Callable[..., ProjectRepository]
OrganizationContextProvider = Callable[..., OrganizationContext]


def create_projects_router(
    repository_provider: RepositoryProvider,
    organization_context_provider: OrganizationContextProvider,
) -> APIRouter:
    router = APIRouter(prefix="/organizations/{organization_id}/projects", tags=["projects"])

    @router.get("", operation_id="list_projects")
    async def list_projects(
        context: Annotated[OrganizationContext, Depends(organization_context_provider)],
        repository: Annotated[ProjectRepository, Depends(repository_provider)],
    ) -> list[ProjectResponse]:
        projects = await ListProjects(repository).execute(context.organization_id)
        return [ProjectResponse.from_domain(project) for project in projects]

    @router.post("", status_code=status.HTTP_201_CREATED, operation_id="create_project")
    async def create_project(
        payload: CreateProjectRequest,
        context: Annotated[OrganizationContext, Depends(organization_context_provider)],
        repository: Annotated[ProjectRepository, Depends(repository_provider)],
        _: Annotated[None, Depends(require_csrf_for_cookie)],
    ) -> ProjectResponse:
        project = await CreateProject(repository).execute(
            organization_id=context.organization_id,
            name=payload.name,
            description=payload.description,
        )
        return ProjectResponse.from_domain(project)

    return router
