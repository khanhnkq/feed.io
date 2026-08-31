from collections.abc import Callable
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from feedio.modules.media.application.ports import MediaRepository, StorageService
from feedio.modules.media.presentation.mappers import to_media_response
from feedio.modules.media.presentation.schemas import MediaResponse
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

    return router
