from collections.abc import Callable
from typing import Annotated, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from feedio.modules.collaboration.application.ports import RealtimeEventPublisher
from feedio.modules.collaboration.domain.entities import RealtimeEvent
from feedio.modules.identity.presentation.dependencies import require_csrf_for_cookie
from feedio.modules.organizations.domain.value_objects import OrganizationContext
from feedio.modules.projects.application.commands.create_folder import CreateFolder
from feedio.modules.projects.application.commands.create_project import CreateProject
from feedio.modules.projects.application.commands.delete_folder import DeleteFolder
from feedio.modules.projects.application.commands.delete_project import DeleteProject
from feedio.modules.projects.application.commands.move_folder import MoveFolder
from feedio.modules.projects.application.commands.rename_folder import RenameFolder
from feedio.modules.projects.application.commands.update_project import UpdateProject
from feedio.modules.projects.application.ports import ProjectRepository
from feedio.modules.projects.application.queries.get_folder import GetFolder
from feedio.modules.projects.application.queries.get_folder_breadcrumbs import (
    GetFolderBreadcrumbs,
)
from feedio.modules.projects.application.queries.get_folder_tree import GetFolderTree
from feedio.modules.projects.application.queries.get_project import GetProject
from feedio.modules.projects.application.queries.list_folders import ListFolders
from feedio.modules.projects.application.queries.list_projects import ListProjects
from feedio.modules.projects.domain.errors import (
    DuplicateFolderNameError,
    FolderCycleError,
    FolderNotFoundError,
    InvalidFolderNameError,
    InvalidProjectNameError,
    ProjectAccessDeniedError,
    ProjectNotFoundError,
)
from feedio.modules.projects.presentation.project_members_router import (
    create_project_members_router,
)
from feedio.modules.projects.presentation.schemas import (
    BreadcrumbItemResponse,
    CreateFolderRequest,
    CreateProjectRequest,
    FolderResponse,
    MoveFolderRequest,
    ProjectResponse,
    RenameFolderRequest,
    UpdateProjectRequest,
)
from feedio.shared.presentation.pagination import PaginatedResponse

RepositoryProvider = Callable[..., ProjectRepository]
OrganizationContextProvider = Callable[..., OrganizationContext]
EventPublisherProvider = Callable[[], RealtimeEventPublisher | None]
NotificationServiceProvider = Callable[..., Any]


def create_projects_router(
    repository_provider: RepositoryProvider,
    organization_context_provider: OrganizationContextProvider,
    event_publisher_provider: EventPublisherProvider | None = None,
    notification_service_provider: NotificationServiceProvider | None = None,
) -> APIRouter:
    router = APIRouter(prefix="/organizations/{organization_id}/projects", tags=["projects"])

    @router.get("", operation_id="list_projects")
    async def list_projects(
        context: Annotated[OrganizationContext, Depends(organization_context_provider)],
        repository: Annotated[ProjectRepository, Depends(repository_provider)],
        cursor: Annotated[str | None, Query(description="Cursor for pagination")] = None,
        limit: Annotated[int, Query(ge=1, le=100, description="Page size limit")] = 50,
    ) -> PaginatedResponse[ProjectResponse]:
        is_admin = context.role in ("owner", "admin")
        page = await ListProjects(repository).execute(
            organization_id=context.organization_id,
            user_id=context.user_id,
            is_admin=is_admin,
            cursor=cursor,
            limit=limit,
        )
        return PaginatedResponse(
            items=[ProjectResponse.from_domain(project) for project in page.items],
            next_cursor=page.next_cursor,
            has_more=page.has_more,
        )

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
                visibility=payload.visibility,
                created_by_user_id=context.user_id,
            )
            resp = ProjectResponse.from_domain(project)
            if event_publisher_provider:
                publisher = event_publisher_provider()
                if publisher:
                    await publisher.publish(
                        RealtimeEvent(
                            event_type="project.created",
                            room=f"org:{context.organization_id}",
                            payload={
                                "project": resp.model_dump(mode="json"),
                                "project_id": str(project.id),
                                "organization_id": str(context.organization_id),
                            },
                        )
                    )
            return resp
        except InvalidProjectNameError as error:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, str(error)) from error

    @router.get("/{project_id}", operation_id="get_project")
    async def get_project(
        project_id: UUID,
        context: Annotated[OrganizationContext, Depends(organization_context_provider)],
        repository: Annotated[ProjectRepository, Depends(repository_provider)],
    ) -> ProjectResponse:
        try:
            is_admin = context.role in ("owner", "admin")
            project = await GetProject(repository).execute(
                organization_id=context.organization_id,
                project_id=project_id,
                user_id=context.user_id,
                is_admin=is_admin,
            )
            return ProjectResponse.from_domain(project)
        except ProjectNotFoundError as error:
            raise HTTPException(status.HTTP_404_NOT_FOUND, str(error)) from error
        except ProjectAccessDeniedError as error:
            raise HTTPException(status.HTTP_403_FORBIDDEN, str(error)) from error

    @router.patch("/{project_id}", operation_id="update_project")
    async def update_project(
        project_id: UUID,
        payload: UpdateProjectRequest,
        context: Annotated[OrganizationContext, Depends(organization_context_provider)],
        repository: Annotated[ProjectRepository, Depends(repository_provider)],
        _: Annotated[None, Depends(require_csrf_for_cookie)],
    ) -> ProjectResponse:
        try:
            project = await UpdateProject(repository).execute(
                organization_id=context.organization_id,
                project_id=project_id,
                name=payload.name,
                description=payload.description,
                visibility=payload.visibility,
            )
            resp = ProjectResponse.from_domain(project)
            if event_publisher_provider:
                publisher = event_publisher_provider()
                if publisher:
                    await publisher.publish(
                        RealtimeEvent(
                            event_type="project.updated",
                            room=f"project:{project_id}",
                            payload={
                                "project": resp.model_dump(mode="json"),
                                "project_id": str(project_id),
                                "organization_id": str(context.organization_id),
                            },
                        )
                    )
                    await publisher.publish(
                        RealtimeEvent(
                            event_type="project.updated",
                            room=f"org:{context.organization_id}",
                            payload={
                                "project": resp.model_dump(mode="json"),
                                "project_id": str(project_id),
                                "organization_id": str(context.organization_id),
                            },
                        )
                    )
            return resp
        except InvalidProjectNameError as error:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, str(error)) from error
        except ProjectNotFoundError as error:
            raise HTTPException(status.HTTP_404_NOT_FOUND, str(error)) from error

    @router.delete(
        "/{project_id}",
        status_code=status.HTTP_204_NO_CONTENT,
        operation_id="delete_project",
    )
    async def delete_project(
        project_id: UUID,
        context: Annotated[OrganizationContext, Depends(organization_context_provider)],
        repository: Annotated[ProjectRepository, Depends(repository_provider)],
        _: Annotated[None, Depends(require_csrf_for_cookie)],
    ) -> None:
        try:
            await DeleteProject(repository).execute(
                organization_id=context.organization_id,
                project_id=project_id,
            )
            if event_publisher_provider:
                publisher = event_publisher_provider()
                if publisher:
                    await publisher.publish(
                        RealtimeEvent(
                            event_type="project.deleted",
                            room=f"project:{project_id}",
                            payload={
                                "project_id": str(project_id),
                                "organization_id": str(context.organization_id),
                            },
                        )
                    )
                    await publisher.publish(
                        RealtimeEvent(
                            event_type="project.deleted",
                            room=f"org:{context.organization_id}",
                            payload={
                                "project_id": str(project_id),
                                "organization_id": str(context.organization_id),
                            },
                        )
                    )
        except ProjectNotFoundError as error:
            raise HTTPException(status.HTTP_404_NOT_FOUND, str(error)) from error

    @router.get("/{project_id}/folders", operation_id="list_folders")
    async def list_folders(
        project_id: UUID,
        context: Annotated[OrganizationContext, Depends(organization_context_provider)],
        repository: Annotated[ProjectRepository, Depends(repository_provider)],
        parent_id: Annotated[UUID | None, Query()] = None,
        cursor: Annotated[str | None, Query(description="Cursor for pagination")] = None,
        limit: Annotated[int, Query(ge=1, le=100, description="Page size limit")] = 50,
    ) -> PaginatedResponse[FolderResponse]:
        page = await ListFolders(repository).execute(
            organization_id=context.organization_id,
            project_id=project_id,
            parent_id=parent_id,
            cursor=cursor,
            limit=limit,
        )
        return PaginatedResponse(
            items=[FolderResponse.from_domain(folder) for folder in page.items],
            next_cursor=page.next_cursor,
            has_more=page.has_more,
        )

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
            resp = FolderResponse.from_domain(folder)
            if event_publisher_provider:
                publisher = event_publisher_provider()
                if publisher:
                    await publisher.publish(
                        RealtimeEvent(
                            event_type="folder.created",
                            room=f"project:{project_id}",
                            payload={
                                "folder": resp.model_dump(mode="json"),
                                "project_id": str(project_id),
                                "parent_id": str(payload.parent_id) if payload.parent_id else None,
                            },
                        )
                    )
            return resp
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
            resp = FolderResponse.from_domain(folder)
            if event_publisher_provider:
                publisher = event_publisher_provider()
                if publisher:
                    await publisher.publish(
                        RealtimeEvent(
                            event_type="folder.updated",
                            room=f"project:{project_id}",
                            payload={
                                "folder": resp.model_dump(mode="json"),
                                "folder_id": str(folder_id),
                                "name": payload.name,
                                "project_id": str(project_id),
                            },
                        )
                    )
            return resp
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
            if event_publisher_provider:
                publisher = event_publisher_provider()
                if publisher:
                    await publisher.publish(
                        RealtimeEvent(
                            event_type="folder.deleted",
                            room=f"project:{project_id}",
                            payload={
                                "folder_id": str(folder_id),
                                "project_id": str(project_id),
                            },
                        )
                    )
        except FolderNotFoundError as error:
            raise HTTPException(status.HTTP_404_NOT_FOUND, str(error)) from error

    @router.get(
        "/{project_id}/folders/tree",
        operation_id="get_folder_tree",
    )
    async def get_folder_tree(
        project_id: UUID,
        context: Annotated[OrganizationContext, Depends(organization_context_provider)],
        repository: Annotated[ProjectRepository, Depends(repository_provider)],
    ) -> list[FolderResponse]:
        folders = await GetFolderTree(repository).execute(
            organization_id=context.organization_id,
            project_id=project_id,
        )
        return [FolderResponse.from_domain(folder) for folder in folders]

    @router.get(
        "/{project_id}/folders/{folder_id}",
        operation_id="get_folder",
    )
    async def get_folder(
        project_id: UUID,
        folder_id: UUID,
        context: Annotated[OrganizationContext, Depends(organization_context_provider)],
        repository: Annotated[ProjectRepository, Depends(repository_provider)],
    ) -> FolderResponse:
        try:
            folder = await GetFolder(repository).execute(
                organization_id=context.organization_id,
                project_id=project_id,
                folder_id=folder_id,
            )
            return FolderResponse.from_domain(folder)
        except FolderNotFoundError as error:
            raise HTTPException(status.HTTP_404_NOT_FOUND, str(error)) from error

    @router.post(
        "/{project_id}/folders/{folder_id}/move",
        operation_id="move_folder",
    )
    async def move_folder(
        project_id: UUID,
        folder_id: UUID,
        payload: MoveFolderRequest,
        context: Annotated[OrganizationContext, Depends(organization_context_provider)],
        repository: Annotated[ProjectRepository, Depends(repository_provider)],
        _: Annotated[None, Depends(require_csrf_for_cookie)],
    ) -> FolderResponse:
        try:
            folder = await MoveFolder(repository).execute(
                organization_id=context.organization_id,
                project_id=project_id,
                folder_id=folder_id,
                new_parent_id=payload.new_parent_id,
            )
            resp = FolderResponse.from_domain(folder)
            if event_publisher_provider:
                publisher = event_publisher_provider()
                if publisher:
                    await publisher.publish(
                        RealtimeEvent(
                            event_type="folder.moved",
                            room=f"project:{project_id}",
                            payload={
                                "folder": resp.model_dump(mode="json"),
                                "folder_id": str(folder_id),
                                "target_parent_id": str(payload.new_parent_id) if payload.new_parent_id else None,
                                "project_id": str(project_id),
                            },
                        )
                    )
            return resp
        except FolderNotFoundError as error:
            raise HTTPException(status.HTTP_404_NOT_FOUND, str(error)) from error
        except FolderCycleError as error:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, str(error)) from error
        except DuplicateFolderNameError as error:
            raise HTTPException(status.HTTP_409_CONFLICT, str(error)) from error

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

    # Mount project members router
    members_router = create_project_members_router(
        repository_provider=repository_provider,
        organization_context_provider=organization_context_provider,
        event_publisher_provider=event_publisher_provider,
        notification_service_provider=notification_service_provider,
    )
    router.include_router(members_router)

    return router
