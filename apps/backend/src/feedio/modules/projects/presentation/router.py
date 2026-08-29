from collections.abc import Callable
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from feedio.modules.identity.presentation.dependencies import require_csrf_for_cookie
from feedio.modules.organizations.domain.value_objects import OrganizationContext
from feedio.modules.projects.application.commands.create_folder import CreateFolder
from feedio.modules.projects.application.commands.create_project import CreateProject
from feedio.modules.projects.application.commands.delete_folder import DeleteFolder
from feedio.modules.projects.application.commands.rename_folder import RenameFolder
from feedio.modules.projects.application.ports import ProjectRepository
from feedio.modules.projects.application.queries.get_folder_breadcrumbs import (
    GetFolderBreadcrumbs,
)
from feedio.modules.projects.application.queries.list_folders import ListFolders
from feedio.modules.projects.application.queries.list_projects import ListProjects
from feedio.modules.projects.domain.errors import (
    DuplicateFolderNameError,
    FolderNotFoundError,
    InvalidFolderNameError,
    InvalidProjectNameError,
)
from feedio.modules.projects.presentation.schemas import (
    BreadcrumbItemResponse,
    CreateFolderRequest,
    CreateProjectRequest,
    FolderResponse,
    ProjectResponse,
    RenameFolderRequest,
)

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
        try:
            project = await CreateProject(repository).execute(
                organization_id=context.organization_id,
                name=payload.name,
                description=payload.description,
            )
            return ProjectResponse.from_domain(project)
        except InvalidProjectNameError as error:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, str(error)) from error

    @router.get("/{project_id}/folders", operation_id="list_folders")
    async def list_folders(
        project_id: UUID,
        context: Annotated[OrganizationContext, Depends(organization_context_provider)],
        repository: Annotated[ProjectRepository, Depends(repository_provider)],
        parent_id: Annotated[UUID | None, Query()] = None,
    ) -> list[FolderResponse]:
        folders = await ListFolders(repository).execute(
            organization_id=context.organization_id,
            project_id=project_id,
            parent_id=parent_id,
        )
        return [FolderResponse.from_domain(folder) for folder in folders]

    @router.post(
        "/{project_id}/folders",
        status_code=status.HTTP_201_CREATED,
        operation_id="create_folder",
    )
    async def create_folder(
        project_id: UUID,
        payload: CreateFolderRequest,
        context: Annotated[OrganizationContext, Depends(organization_context_provider)],
        repository: Annotated[ProjectRepository, Depends(repository_provider)],
        _: Annotated[None, Depends(require_csrf_for_cookie)],
    ) -> FolderResponse:
        try:
            folder = await CreateFolder(repository).execute(
                organization_id=context.organization_id,
                project_id=project_id,
                name=payload.name,
                parent_id=payload.parent_id,
            )
            return FolderResponse.from_domain(folder)
        except InvalidFolderNameError as error:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, str(error)) from error
        except FolderNotFoundError as error:
            raise HTTPException(status.HTTP_404_NOT_FOUND, str(error)) from error
        except DuplicateFolderNameError as error:
            raise HTTPException(status.HTTP_409_CONFLICT, str(error)) from error

    @router.patch(
        "/{project_id}/folders/{folder_id}",
        operation_id="rename_folder",
    )
    async def rename_folder(
        project_id: UUID,
        folder_id: UUID,
        payload: RenameFolderRequest,
        context: Annotated[OrganizationContext, Depends(organization_context_provider)],
        repository: Annotated[ProjectRepository, Depends(repository_provider)],
        _: Annotated[None, Depends(require_csrf_for_cookie)],
    ) -> FolderResponse:
        try:
            folder = await RenameFolder(repository).execute(
                organization_id=context.organization_id,
                project_id=project_id,
                folder_id=folder_id,
                new_name=payload.name,
            )
            return FolderResponse.from_domain(folder)
        except InvalidFolderNameError as error:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, str(error)) from error
        except FolderNotFoundError as error:
            raise HTTPException(status.HTTP_404_NOT_FOUND, str(error)) from error
        except DuplicateFolderNameError as error:
            raise HTTPException(status.HTTP_409_CONFLICT, str(error)) from error

    @router.delete(
        "/{project_id}/folders/{folder_id}",
        status_code=status.HTTP_204_NO_CONTENT,
        operation_id="delete_folder",
    )
    async def delete_folder(
        project_id: UUID,
        folder_id: UUID,
        context: Annotated[OrganizationContext, Depends(organization_context_provider)],
        repository: Annotated[ProjectRepository, Depends(repository_provider)],
        _: Annotated[None, Depends(require_csrf_for_cookie)],
    ) -> None:
        try:
            await DeleteFolder(repository).execute(
                organization_id=context.organization_id,
                project_id=project_id,
                folder_id=folder_id,
            )
        except FolderNotFoundError as error:
            raise HTTPException(status.HTTP_404_NOT_FOUND, str(error)) from error

    @router.get(
        "/{project_id}/folders/{folder_id}/breadcrumbs",
        operation_id="get_folder_breadcrumbs",
    )
    async def get_folder_breadcrumbs(
        project_id: UUID,
        folder_id: UUID,
        context: Annotated[OrganizationContext, Depends(organization_context_provider)],
        repository: Annotated[ProjectRepository, Depends(repository_provider)],
    ) -> list[BreadcrumbItemResponse]:
        breadcrumbs = await GetFolderBreadcrumbs(repository).execute(
            organization_id=context.organization_id,
            project_id=project_id,
            folder_id=folder_id,
        )
        return [BreadcrumbItemResponse.from_domain(item) for item in breadcrumbs]

    return router
