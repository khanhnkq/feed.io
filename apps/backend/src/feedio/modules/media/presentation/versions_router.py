from collections.abc import Callable
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from feedio.modules.identity.presentation.dependencies import require_csrf_for_cookie
from feedio.modules.media.application.commands.set_primary_version import (
    SetPrimaryVersion,
)
from feedio.modules.media.application.commands.stack_media import StackMedia
from feedio.modules.media.application.commands.unstack_media import UnstackMedia
from feedio.modules.media.application.commands.update_version_label import (
    UpdateVersionLabel,
)
from feedio.modules.media.application.ports import MediaRepository, StorageService
from feedio.modules.media.domain.errors import (
    InvalidVersionOperationError,
    MediaNotFoundError,
)
from feedio.modules.media.presentation.mappers import to_media_response
from feedio.modules.media.presentation.schemas import (
    MediaResponse,
    StackMediaRequest,
    UpdateVersionLabelRequest,
)
from feedio.modules.organizations.domain.value_objects import (
    OrganizationContext,
    OrganizationRole,
)
from feedio.modules.projects.application.ports import ProjectRepository
from feedio.modules.projects.application.queries.get_project import GetProject
from feedio.modules.projects.domain.errors import (
    ProjectAccessDeniedError,
    ProjectNotFoundError,
)


def create_media_versions_router(
    media_repository_provider: Callable[..., MediaRepository],
    project_repository_provider: Callable[..., ProjectRepository],
    storage_service_provider: Callable[..., StorageService],
    organization_context_provider: Callable[..., OrganizationContext],
) -> APIRouter:
    router = APIRouter()

    async def _verify_project_access(
        context: OrganizationContext,
        project_repo: ProjectRepository,
        project_id: UUID,
    ) -> None:
        is_admin = context.role in {OrganizationRole.OWNER, OrganizationRole.ADMIN}
        try:
            await GetProject(project_repo).execute(
                organization_id=context.organization_id,
                project_id=project_id,
                user_id=context.user_id,
                is_admin=is_admin,
            )
        except ProjectNotFoundError as e:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found") from e
        except ProjectAccessDeniedError as e:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Access denied to project") from e

    @router.post(
        "/stack",
        response_model=MediaResponse,
        operation_id="stack_media_global",
        dependencies=[Depends(require_csrf_for_cookie)],
    )
    async def stack_media_global(
        project_id: UUID,
        payload: StackMediaRequest,
        context: Annotated[OrganizationContext, Depends(organization_context_provider)],
        media_repository: Annotated[MediaRepository, Depends(media_repository_provider)],
        project_repository: Annotated[ProjectRepository, Depends(project_repository_provider)],
        storage: Annotated[StorageService, Depends(storage_service_provider)],
    ) -> MediaResponse:
        await _verify_project_access(context, project_repository, project_id)
        if not payload.target_media_id:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "target_media_id is required")
        try:
            _, new_version = await StackMedia(media_repository).execute(
                organization_id=context.organization_id,
                project_id=project_id,
                target_media_id=payload.target_media_id,
                source_media_id=payload.source_media_id,
                version_label=payload.version_label,
            )
            return await to_media_response(new_version, storage)
        except MediaNotFoundError as e:
            raise HTTPException(status.HTTP_404_NOT_FOUND, str(e)) from e
        except InvalidVersionOperationError as e:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e)) from e

    @router.get(
        "/{media_id}/versions",
        response_model=list[MediaResponse],
        operation_id="get_media_versions",
    )
    async def get_media_versions(
        project_id: UUID,
        media_id: UUID,
        context: Annotated[OrganizationContext, Depends(organization_context_provider)],
        media_repository: Annotated[MediaRepository, Depends(media_repository_provider)],
        project_repository: Annotated[ProjectRepository, Depends(project_repository_provider)],
        storage: Annotated[StorageService, Depends(storage_service_provider)],
    ) -> list[MediaResponse]:
        await _verify_project_access(context, project_repository, project_id)
        current = await media_repository.get_by_id(
            organization_id=context.organization_id,
            project_id=project_id,
            media_id=media_id,
        )
        if not current:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Media not found")

        if not current.version_group_id:
            return [await to_media_response(current, storage)]

        versions = await media_repository.list_versions(
            organization_id=context.organization_id,
            project_id=project_id,
            version_group_id=current.version_group_id,
        )
        return [await to_media_response(v, storage) for v in versions]

    @router.post(
        "/{media_id}/stack",
        response_model=MediaResponse,
        operation_id="stack_media",
        dependencies=[Depends(require_csrf_for_cookie)],
    )
    async def stack_media(
        project_id: UUID,
        media_id: UUID,
        payload: StackMediaRequest,
        context: Annotated[OrganizationContext, Depends(organization_context_provider)],
        media_repository: Annotated[MediaRepository, Depends(media_repository_provider)],
        project_repository: Annotated[ProjectRepository, Depends(project_repository_provider)],
        storage: Annotated[StorageService, Depends(storage_service_provider)],
    ) -> MediaResponse:
        await _verify_project_access(context, project_repository, project_id)
        try:
            _, new_version = await StackMedia(media_repository).execute(
                organization_id=context.organization_id,
                project_id=project_id,
                target_media_id=media_id,
                source_media_id=payload.source_media_id,
                version_label=payload.version_label,
            )
            return await to_media_response(new_version, storage)
        except MediaNotFoundError as e:
            raise HTTPException(status.HTTP_404_NOT_FOUND, str(e)) from e
        except InvalidVersionOperationError as e:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e)) from e

    @router.post(
        "/{media_id}/unstack",
        response_model=MediaResponse,
        operation_id="unstack_media",
        dependencies=[Depends(require_csrf_for_cookie)],
    )
    async def unstack_media(
        project_id: UUID,
        media_id: UUID,
        context: Annotated[OrganizationContext, Depends(organization_context_provider)],
        media_repository: Annotated[MediaRepository, Depends(media_repository_provider)],
        project_repository: Annotated[ProjectRepository, Depends(project_repository_provider)],
        storage: Annotated[StorageService, Depends(storage_service_provider)],
    ) -> MediaResponse:
        await _verify_project_access(context, project_repository, project_id)
        try:
            result = await UnstackMedia(media_repository).execute(
                organization_id=context.organization_id,
                project_id=project_id,
                media_id=media_id,
            )
            return await to_media_response(result, storage)
        except MediaNotFoundError as e:
            raise HTTPException(status.HTTP_404_NOT_FOUND, str(e)) from e
        except InvalidVersionOperationError as e:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e)) from e

    @router.post(
        "/{media_id}/set-primary",
        response_model=MediaResponse,
        operation_id="set_primary_version",
        dependencies=[Depends(require_csrf_for_cookie)],
    )
    async def set_primary_version(
        project_id: UUID,
        media_id: UUID,
        context: Annotated[OrganizationContext, Depends(organization_context_provider)],
        media_repository: Annotated[MediaRepository, Depends(media_repository_provider)],
        project_repository: Annotated[ProjectRepository, Depends(project_repository_provider)],
        storage: Annotated[StorageService, Depends(storage_service_provider)],
    ) -> MediaResponse:
        await _verify_project_access(context, project_repository, project_id)
        try:
            result = await SetPrimaryVersion(media_repository).execute(
                organization_id=context.organization_id,
                project_id=project_id,
                media_id=media_id,
            )
            return await to_media_response(result, storage)
        except MediaNotFoundError as e:
            raise HTTPException(status.HTTP_404_NOT_FOUND, str(e)) from e
        except InvalidVersionOperationError as e:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e)) from e

    @router.patch(
        "/{media_id}/version-label",
        response_model=MediaResponse,
        operation_id="update_version_label",
        dependencies=[Depends(require_csrf_for_cookie)],
    )
    async def update_version_label(
        project_id: UUID,
        media_id: UUID,
        payload: UpdateVersionLabelRequest,
        context: Annotated[OrganizationContext, Depends(organization_context_provider)],
        media_repository: Annotated[MediaRepository, Depends(media_repository_provider)],
        project_repository: Annotated[ProjectRepository, Depends(project_repository_provider)],
        storage: Annotated[StorageService, Depends(storage_service_provider)],
    ) -> MediaResponse:
        await _verify_project_access(context, project_repository, project_id)
        try:
            result = await UpdateVersionLabel(media_repository).execute(
                organization_id=context.organization_id,
                project_id=project_id,
                media_id=media_id,
                version_label=payload.version_label,
            )
            return await to_media_response(result, storage)
        except MediaNotFoundError as e:
            raise HTTPException(status.HTTP_404_NOT_FOUND, str(e)) from e
        except InvalidVersionOperationError as e:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e)) from e

    return router
