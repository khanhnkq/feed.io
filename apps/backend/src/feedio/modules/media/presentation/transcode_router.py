from collections.abc import Callable
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from feedio.modules.identity.presentation.dependencies import require_csrf_for_cookie
from feedio.modules.media.application.ports import (
    MediaJobPublisher,
    MediaRepository,
    StorageService,
)
from feedio.modules.media.infrastructure.quota_service import StorageQuotaService
from feedio.modules.media.presentation.mappers import to_media_response
from feedio.modules.media.presentation.schemas import (
    MediaResponse,
    TranscodeProgressResponse,
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


def create_transcode_router(
    media_repository_provider: Callable[..., MediaRepository],
    project_repository_provider: Callable[..., ProjectRepository],
    storage_service_provider: Callable[..., StorageService],
    organization_context_provider: Callable[..., OrganizationContext],
    job_publisher_provider: Callable[..., MediaJobPublisher | None] | None = None,
) -> APIRouter:
    router = APIRouter(tags=["media-transcode"])

    def _default_none_publisher() -> MediaJobPublisher | None:
        return None

    publisher_dep = job_publisher_provider or _default_none_publisher

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
        "/{media_id}/retry-transcode",
        response_model=MediaResponse,
        operation_id="retry_media_transcode",
        dependencies=[Depends(require_csrf_for_cookie)],
    )
    async def retry_transcode(
        project_id: UUID,
        media_id: UUID,
        context: Annotated[OrganizationContext, Depends(organization_context_provider)],
        media_repository: Annotated[MediaRepository, Depends(media_repository_provider)],
        project_repository: Annotated[ProjectRepository, Depends(project_repository_provider)],
        storage: Annotated[StorageService, Depends(storage_service_provider)],
        publisher: Annotated[
            MediaJobPublisher | None,
            Depends(publisher_dep),
        ] = None,
    ) -> MediaResponse:
        await _verify_project_access(context, project_repository, project_id)
        media = await media_repository.get_by_id(
            organization_id=context.organization_id,
            project_id=project_id,
            media_id=media_id,
        )
        if not media:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Media asset not found")

        updated = await media_repository.update_status(
            organization_id=context.organization_id,
            project_id=project_id,
            media_id=media_id,
            status="processing",
        )
        if publisher:
            await publisher.publish_transcode_job(
                organization_id=context.organization_id,
                project_id=project_id,
                media_id=media_id,
                storage_key=media.storage_key,
                filename=media.filename,
                mime_type=media.mime_type,
            )
        return await to_media_response(updated, storage)

    @router.get(
        "/{media_id}/transcode-progress",
        response_model=TranscodeProgressResponse,
        operation_id="get_media_transcode_progress",
    )
    async def get_transcode_progress(
        project_id: UUID,
        media_id: UUID,
        context: Annotated[OrganizationContext, Depends(organization_context_provider)],
        media_repository: Annotated[MediaRepository, Depends(media_repository_provider)],
        project_repository: Annotated[ProjectRepository, Depends(project_repository_provider)],
    ) -> TranscodeProgressResponse:
        await _verify_project_access(context, project_repository, project_id)
        media = await media_repository.get_by_id(
            organization_id=context.organization_id,
            project_id=project_id,
            media_id=media_id,
        )
        if not media:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Media asset not found")

        if media.status == "ready":
            return TranscodeProgressResponse(
                media_id=media_id,
                status="ready",
                progress_percent=100,
                current_stage="completed",
            )
        if media.status == "failed":
            return TranscodeProgressResponse(
                media_id=media_id,
                status="failed",
                progress_percent=0,
                current_stage="error",
            )

        progress_percent = 50
        current_stage = "processing"
        quota_service = StorageQuotaService(media_repository)
        if hasattr(quota_service, "_valkey") and quota_service._valkey:
            try:
                import json

                cached = await quota_service._valkey.get(f"transcode:progress:{media_id}")
                if cached:
                    data = json.loads(cached)
                    progress_percent = int(data.get("progress_percent", 50))
                    current_stage = str(data.get("current_stage", "processing"))
            except Exception:
                pass

        return TranscodeProgressResponse(
            media_id=media_id,
            status=media.status,
            progress_percent=progress_percent,
            current_stage=current_stage,
        )

    return router
