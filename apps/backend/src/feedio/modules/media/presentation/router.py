from collections.abc import Callable
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from feedio.modules.collaboration.application.ports import RealtimeEventPublisher
from feedio.modules.collaboration.domain.entities import RealtimeEvent
from feedio.modules.identity.presentation.dependencies import require_csrf_for_cookie
from feedio.modules.media.application.commands.complete_media_upload import CompleteMediaUpload
from feedio.modules.media.application.commands.delete_media import DeleteMedia
from feedio.modules.media.application.commands.move_media import MoveMedia
from feedio.modules.media.application.commands.presign_media_upload import PresignMediaUpload
from feedio.modules.media.application.commands.update_media import UpdateMedia
from feedio.modules.media.application.ports import (
    MediaJobPublisher,
    MediaRepository,
    StorageService,
)
from feedio.modules.media.application.queries.get_media import GetMedia
from feedio.modules.media.application.queries.list_media import ListMedia
from feedio.modules.media.domain.errors import (
    FileTooLargeError,
    InvalidMediaTypeError,
    MediaNotFoundError,
    MediaUploadIncompleteError,
    StorageQuotaExceededError,
)
from feedio.modules.media.infrastructure.quota_service import StorageQuotaService
from feedio.modules.media.presentation.mappers import to_media_response
from feedio.modules.media.presentation.multipart_router import create_multipart_media_router
from feedio.modules.media.presentation.schemas import (
    MediaResponse,
    MediaStreamResponse,
    MoveMediaRequest,
    PresignMediaUploadRequest,
    PresignMediaUploadResponse,
    ThumbnailResponse,
    TranscodeProgressResponse,
    UpdateMediaRequest,
)
from feedio.modules.media.presentation.share_links_router import (
    create_share_links_router,
)
from feedio.modules.media.presentation.transcode_router import (
    create_transcode_router,
)
from feedio.modules.media.presentation.versions_router import create_media_versions_router
from feedio.modules.organizations.domain.value_objects import OrganizationContext
from feedio.modules.projects.application.ports import ProjectRepository
from feedio.modules.projects.application.queries.get_project import GetProject
from feedio.modules.projects.domain.errors import ProjectAccessDeniedError, ProjectNotFoundError
from feedio.shared.presentation.pagination import PaginatedResponse

MediaRepositoryProvider = Callable[..., MediaRepository]
ProjectRepositoryProvider = Callable[..., ProjectRepository]
StorageServiceProvider = Callable[..., StorageService]
OrganizationContextProvider = Callable[..., OrganizationContext]
JobPublisherProvider = Callable[..., MediaJobPublisher | None]
EventPublisherProvider = Callable[[], RealtimeEventPublisher | None]


def create_media_router(
    media_repository_provider: MediaRepositoryProvider,
    project_repository_provider: ProjectRepositoryProvider,
    storage_service_provider: StorageServiceProvider,
    organization_context_provider: OrganizationContextProvider,
    job_publisher_provider: JobPublisherProvider | None = None,
    event_publisher_provider: EventPublisherProvider | None = None,
) -> APIRouter:
    router = APIRouter(
        prefix="/organizations/{organization_id}/projects/{project_id}/media",
        tags=["media"],
    )

    def _default_none_publisher() -> MediaJobPublisher | None:
        return None

    publisher_dep = job_publisher_provider or _default_none_publisher

    async def _verify_project_access(
        context: OrganizationContext,
        project_repository: ProjectRepository,
        project_id: UUID,
    ) -> None:
        try:
            is_admin = context.role in ("owner", "admin")
            await GetProject(project_repository).execute(
                organization_id=context.organization_id,
                project_id=project_id,
                user_id=context.user_id,
                is_admin=is_admin,
            )
        except ProjectNotFoundError as e:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Project not found") from e
        except ProjectAccessDeniedError as e:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Access denied to project") from e

    # Include multipart router
    router.include_router(
        create_multipart_media_router(
            media_repository_provider=media_repository_provider,
            project_repository_provider=project_repository_provider,
            storage_service_provider=storage_service_provider,
            organization_context_provider=organization_context_provider,
            job_publisher_provider=publisher_dep,
            event_publisher_provider=event_publisher_provider,
        )
    )

    # Include versions router
    router.include_router(
        create_media_versions_router(
            media_repository_provider=media_repository_provider,
            project_repository_provider=project_repository_provider,
            storage_service_provider=storage_service_provider,
            organization_context_provider=organization_context_provider,
        )
    )

    # Include share links router
    router.include_router(
        create_share_links_router(
            media_repository_provider=media_repository_provider,
            project_repository_provider=project_repository_provider,
            organization_context_provider=organization_context_provider,
        )
    )

    # Include transcode router
    router.include_router(
        create_transcode_router(
            media_repository_provider=media_repository_provider,
            project_repository_provider=project_repository_provider,
            storage_service_provider=storage_service_provider,
            organization_context_provider=organization_context_provider,
            job_publisher_provider=publisher_dep,
        )
    )

    @router.post(
        "/presign-upload",
        response_model=PresignMediaUploadResponse,
        operation_id="presign_media_upload",
        dependencies=[Depends(require_csrf_for_cookie)],
    )
    async def presign_upload(
        project_id: UUID,
        payload: PresignMediaUploadRequest,
        context: Annotated[OrganizationContext, Depends(organization_context_provider)],
        media_repository: Annotated[MediaRepository, Depends(media_repository_provider)],
        project_repository: Annotated[ProjectRepository, Depends(project_repository_provider)],
        storage: Annotated[StorageService, Depends(storage_service_provider)],
    ) -> PresignMediaUploadResponse:
        await _verify_project_access(context, project_repository, project_id)
        quota_service = StorageQuotaService(media_repository)
        try:
            result = await PresignMediaUpload(
                repository=media_repository,
                storage=storage,
                quota_service=quota_service,
            ).execute(
                organization_id=context.organization_id,
                project_id=project_id,
                user_id=context.user_id,
                filename=payload.filename,
                file_size_bytes=payload.file_size_bytes,
                mime_type=payload.mime_type,
                folder_id=payload.folder_id,
                duration_seconds=payload.duration_seconds,
                width=payload.width,
                height=payload.height,
                has_thumbnail=payload.has_thumbnail,
            )
            return PresignMediaUploadResponse(
                media_id=result.media.id,
                upload_url=result.upload_url,
                storage_key=result.media.storage_key,
                thumbnail_upload_url=result.thumbnail_upload_url,
                thumbnail_storage_key=result.media.thumbnail_storage_key,
            )
        except (StorageQuotaExceededError, FileTooLargeError) as e:
            raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, str(e)) from e
        except InvalidMediaTypeError as e:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e)) from e

    @router.post(
        "/{media_id}/complete",
        response_model=MediaResponse,
        operation_id="complete_media_upload",
        dependencies=[Depends(require_csrf_for_cookie)],
    )
    async def complete_upload(
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
        try:
            media = await CompleteMediaUpload(
                repository=media_repository,
                storage=storage,
                job_publisher=publisher,
            ).execute(
                organization_id=context.organization_id,
                project_id=project_id,
                media_id=media_id,
            )
            media_resp = await to_media_response(media, storage)
            if event_publisher_provider:
                event_publisher = event_publisher_provider()
                if event_publisher:
                    await event_publisher.publish(
                        RealtimeEvent(
                            event_type="media.created",
                            room=f"project:{project_id}",
                            payload={
                                "media": media_resp.model_dump(mode="json"),
                                "project_id": str(project_id),
                                "folder_id": str(media.folder_id) if media.folder_id else None,
                            },
                        )
                    )
            return media_resp
        except MediaNotFoundError as e:
            raise HTTPException(status.HTTP_404_NOT_FOUND, str(e)) from e
        except MediaUploadIncompleteError as e:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e)) from e

    @router.get(
        "",
        response_model=PaginatedResponse[MediaResponse],
        operation_id="list_media",
    )
    async def list_media_endpoint(
        project_id: UUID,
        context: Annotated[OrganizationContext, Depends(organization_context_provider)],
        media_repository: Annotated[MediaRepository, Depends(media_repository_provider)],
        project_repository: Annotated[ProjectRepository, Depends(project_repository_provider)],
        storage: Annotated[StorageService, Depends(storage_service_provider)],
        folder_id: Annotated[UUID | None, Query()] = None,
        include_subfolders: Annotated[
            bool, Query(description="Include media inside child folders")
        ] = False,
        cursor: Annotated[str | None, Query(description="Cursor for pagination")] = None,
        limit: Annotated[int, Query(ge=1, le=100, description="Page size limit")] = 50,
    ) -> PaginatedResponse[MediaResponse]:
        await _verify_project_access(context, project_repository, project_id)
        page = await ListMedia(media_repository).execute(
            organization_id=context.organization_id,
            project_id=project_id,
            folder_id=folder_id,
            include_subfolders=include_subfolders,
            cursor=cursor,
            limit=limit,
        )
        return PaginatedResponse(
            items=[await to_media_response(item, storage) for item in page.items],
            next_cursor=page.next_cursor,
            has_more=page.has_more,
        )

    @router.get(
        "/{media_id}",
        response_model=MediaResponse,
        operation_id="get_media",
    )
    async def get_media_endpoint(
        project_id: UUID,
        media_id: UUID,
        context: Annotated[OrganizationContext, Depends(organization_context_provider)],
        media_repository: Annotated[MediaRepository, Depends(media_repository_provider)],
        project_repository: Annotated[ProjectRepository, Depends(project_repository_provider)],
        storage: Annotated[StorageService, Depends(storage_service_provider)],
    ) -> MediaResponse:
        await _verify_project_access(context, project_repository, project_id)
        try:
            result = await GetMedia(media_repository, storage).execute(
                organization_id=context.organization_id,
                project_id=project_id,
                media_id=media_id,
            )
            return await to_media_response(result.media, storage)
        except MediaNotFoundError as e:
            raise HTTPException(status.HTTP_404_NOT_FOUND, str(e)) from e

    @router.get(
        "/{media_id}/stream",
        response_model=MediaStreamResponse,
        operation_id="get_media_stream",
    )
    async def get_media_stream(
        project_id: UUID,
        media_id: UUID,
        context: Annotated[OrganizationContext, Depends(organization_context_provider)],
        media_repository: Annotated[MediaRepository, Depends(media_repository_provider)],
        project_repository: Annotated[ProjectRepository, Depends(project_repository_provider)],
        storage: Annotated[StorageService, Depends(storage_service_provider)],
    ) -> MediaStreamResponse:
        await _verify_project_access(context, project_repository, project_id)
        try:
            result = await GetMedia(media_repository, storage).execute(
                organization_id=context.organization_id,
                project_id=project_id,
                media_id=media_id,
            )
            media_resp = await to_media_response(result.media, storage)
            return MediaStreamResponse(
                media=media_resp,
                stream_url=result.stream_url,
            )
        except MediaNotFoundError as e:
            raise HTTPException(status.HTTP_404_NOT_FOUND, str(e)) from e

    @router.get(
        "/{media_id}/thumbnail",
        response_model=ThumbnailResponse,
        operation_id="get_media_thumbnail",
    )
    async def get_media_thumbnail(
        project_id: UUID,
        media_id: UUID,
        context: Annotated[OrganizationContext, Depends(organization_context_provider)],
        media_repository: Annotated[MediaRepository, Depends(media_repository_provider)],
        project_repository: Annotated[ProjectRepository, Depends(project_repository_provider)],
        storage: Annotated[StorageService, Depends(storage_service_provider)],
    ) -> ThumbnailResponse:
        await _verify_project_access(context, project_repository, project_id)
        try:
            result = await GetMedia(media_repository, storage).execute(
                organization_id=context.organization_id,
                project_id=project_id,
                media_id=media_id,
            )
            if not result.media.thumbnail_storage_key:
                raise HTTPException(status.HTTP_404_NOT_FOUND, "Thumbnail not found")

            thumbnail_url = await storage.generate_presigned_view_url(
                storage_key=result.media.thumbnail_storage_key,
                expires_in=7200,
            )
            return ThumbnailResponse(
                thumbnail_url=thumbnail_url,
            )
        except MediaNotFoundError as e:
            raise HTTPException(status.HTTP_404_NOT_FOUND, str(e)) from e

    @router.patch(
        "/{media_id}",
        response_model=MediaResponse,
        operation_id="update_media",
        dependencies=[Depends(require_csrf_for_cookie)],
    )
    async def update_media(
        project_id: UUID,
        media_id: UUID,
        payload: UpdateMediaRequest,
        context: Annotated[OrganizationContext, Depends(organization_context_provider)],
        media_repository: Annotated[MediaRepository, Depends(media_repository_provider)],
        project_repository: Annotated[ProjectRepository, Depends(project_repository_provider)],
        storage: Annotated[StorageService, Depends(storage_service_provider)],
    ) -> MediaResponse:
        await _verify_project_access(context, project_repository, project_id)
        try:
            media = await UpdateMedia(media_repository).execute(
                organization_id=context.organization_id,
                project_id=project_id,
                media_id=media_id,
                title=payload.title,
            )
            media_resp = await to_media_response(media, storage)
            if event_publisher_provider:
                publisher = event_publisher_provider()
                if publisher:
                    await publisher.publish(
                        RealtimeEvent(
                            event_type="media.updated",
                            room=f"project:{project_id}",
                            payload={
                                "media": media_resp.model_dump(mode="json"),
                                "project_id": str(project_id),
                            },
                        )
                    )
            return media_resp
        except MediaNotFoundError as e:
            raise HTTPException(status.HTTP_404_NOT_FOUND, str(e)) from e

    @router.post(
        "/{media_id}/move",
        response_model=MediaResponse,
        operation_id="move_media",
        dependencies=[Depends(require_csrf_for_cookie)],
    )
    async def move_media(
        project_id: UUID,
        media_id: UUID,
        payload: MoveMediaRequest,
        context: Annotated[OrganizationContext, Depends(organization_context_provider)],
        media_repository: Annotated[MediaRepository, Depends(media_repository_provider)],
        project_repository: Annotated[ProjectRepository, Depends(project_repository_provider)],
        storage: Annotated[StorageService, Depends(storage_service_provider)],
    ) -> MediaResponse:
        await _verify_project_access(context, project_repository, project_id)
        try:
            media = await MoveMedia(media_repository).execute(
                organization_id=context.organization_id,
                project_id=project_id,
                media_id=media_id,
                target_folder_id=payload.target_folder_id,
            )
            media_resp = await to_media_response(media, storage)
            if event_publisher_provider:
                publisher = event_publisher_provider()
                if publisher:
                    await publisher.publish(
                        RealtimeEvent(
                            event_type="media.moved",
                            room=f"project:{project_id}",
                            payload={
                                "media": media_resp.model_dump(mode="json"),
                                "project_id": str(project_id),
                                "folder_id": str(payload.target_folder_id) if payload.target_folder_id else None,
                            },
                        )
                    )
            return media_resp
        except MediaNotFoundError as e:
            raise HTTPException(status.HTTP_404_NOT_FOUND, str(e)) from e

    @router.delete(
        "/{media_id}",
        status_code=status.HTTP_204_NO_CONTENT,
        operation_id="delete_media",
        dependencies=[Depends(require_csrf_for_cookie)],
    )
    async def delete_media(
        project_id: UUID,
        media_id: UUID,
        context: Annotated[OrganizationContext, Depends(organization_context_provider)],
        media_repository: Annotated[MediaRepository, Depends(media_repository_provider)],
        project_repository: Annotated[ProjectRepository, Depends(project_repository_provider)],
    ) -> None:
        await _verify_project_access(context, project_repository, project_id)
        try:
            await DeleteMedia(media_repository).execute(
                organization_id=context.organization_id,
                project_id=project_id,
                media_id=media_id,
            )
            if event_publisher_provider:
                publisher = event_publisher_provider()
                if publisher:
                    delete_payload = {
                        "media_id": str(media_id),
                        "project_id": str(project_id),
                    }
                    await publisher.publish(
                        RealtimeEvent(
                            event_type="media.deleted",
                            room=f"project:{project_id}",
                            payload=delete_payload,
                        )
                    )
                    await publisher.publish(
                        RealtimeEvent(
                            event_type="media.deleted",
                            room=f"media:{media_id}",
                            payload=delete_payload,
                        )
                    )
        except MediaNotFoundError as e:
            raise HTTPException(status.HTTP_404_NOT_FOUND, str(e)) from e

    return router
