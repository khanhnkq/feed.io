from collections.abc import Callable
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from feedio.modules.identity.presentation.dependencies import require_csrf_for_cookie
from feedio.modules.media.application.commands.abort_multipart_upload import AbortMultipartUpload
from feedio.modules.media.application.commands.complete_multipart_media_upload import (
    CompleteMultipartMediaUpload,
)
from feedio.modules.media.application.commands.initiate_multipart_upload import (
    InitiateMultipartUpload,
)
from feedio.modules.media.application.commands.presign_multipart_parts import (
    PresignMultipartParts,
)
from feedio.modules.media.application.ports import (
    MediaJobPublisher,
    MediaRepository,
    StorageService,
)
from feedio.modules.media.domain.errors import (
    FileTooLargeError,
    InvalidMediaTypeError,
    MediaNotFoundError,
    MediaUploadIncompleteError,
    StorageQuotaExceededError,
)
from feedio.modules.media.infrastructure.quota_service import StorageQuotaService
from feedio.modules.media.presentation.mappers import to_media_response
from feedio.modules.media.presentation.schemas import (
    AbortMultipartUploadRequest,
    AbortMultipartUploadResponse,
    CompleteMultipartUploadRequest,
    InitiateMultipartUploadRequest,
    InitiateMultipartUploadResponse,
    MediaResponse,
    MultipartPartPresignedUrl,
    PresignMultipartPartsRequest,
    PresignMultipartPartsResponse,
)
from feedio.modules.organizations.domain.value_objects import OrganizationContext
from feedio.modules.projects.application.ports import ProjectRepository
from feedio.modules.projects.application.queries.get_project import GetProject
from feedio.modules.projects.domain.errors import ProjectAccessDeniedError, ProjectNotFoundError

MediaRepositoryProvider = Callable[..., MediaRepository]
ProjectRepositoryProvider = Callable[..., ProjectRepository]
StorageServiceProvider = Callable[..., StorageService]
OrganizationContextProvider = Callable[..., OrganizationContext]
JobPublisherProvider = Callable[..., MediaJobPublisher | None]


def create_multipart_media_router(
    media_repository_provider: MediaRepositoryProvider,
    project_repository_provider: ProjectRepositoryProvider,
    storage_service_provider: StorageServiceProvider,
    organization_context_provider: OrganizationContextProvider,
    job_publisher_provider: JobPublisherProvider | None = None,
) -> APIRouter:
    router = APIRouter()

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

    @router.post(
        "/multipart/initiate",
        response_model=InitiateMultipartUploadResponse,
        operation_id="initiate_multipart_upload",
        dependencies=[Depends(require_csrf_for_cookie)],
    )
    async def initiate_multipart(
        project_id: UUID,
        payload: InitiateMultipartUploadRequest,
        context: Annotated[OrganizationContext, Depends(organization_context_provider)],
        media_repository: Annotated[MediaRepository, Depends(media_repository_provider)],
        project_repository: Annotated[ProjectRepository, Depends(project_repository_provider)],
        storage: Annotated[StorageService, Depends(storage_service_provider)],
    ) -> InitiateMultipartUploadResponse:
        await _verify_project_access(context, project_repository, project_id)
        quota_service = StorageQuotaService(media_repository)
        try:
            result = await InitiateMultipartUpload(
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
                part_size_bytes=payload.part_size_bytes,
            )
            return InitiateMultipartUploadResponse(
                media_id=result.media.id,
                upload_id=result.upload_id,
                storage_key=result.media.storage_key,
                part_size_bytes=result.part_size_bytes,
                total_parts=result.total_parts,
                thumbnail_upload_url=result.thumbnail_upload_url,
                thumbnail_storage_key=result.media.thumbnail_storage_key,
            )
        except (StorageQuotaExceededError, FileTooLargeError) as e:
            raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, str(e)) from e
        except InvalidMediaTypeError as e:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e)) from e

    @router.post(
        "/{media_id}/multipart/presign-parts",
        response_model=PresignMultipartPartsResponse,
        operation_id="presign_multipart_parts",
        dependencies=[Depends(require_csrf_for_cookie)],
    )
    async def presign_parts(
        project_id: UUID,
        media_id: UUID,
        payload: PresignMultipartPartsRequest,
        context: Annotated[OrganizationContext, Depends(organization_context_provider)],
        media_repository: Annotated[MediaRepository, Depends(media_repository_provider)],
        project_repository: Annotated[ProjectRepository, Depends(project_repository_provider)],
        storage: Annotated[StorageService, Depends(storage_service_provider)],
    ) -> PresignMultipartPartsResponse:
        await _verify_project_access(context, project_repository, project_id)
        try:
            parts_result = await PresignMultipartParts(media_repository, storage).execute(
                organization_id=context.organization_id,
                project_id=project_id,
                media_id=media_id,
                upload_id=payload.upload_id,
                part_numbers=payload.part_numbers,
            )
            return PresignMultipartPartsResponse(
                media_id=media_id,
                upload_id=payload.upload_id,
                parts=[
                    MultipartPartPresignedUrl(
                        part_number=p.part_number,
                        upload_url=p.upload_url,
                    )
                    for p in parts_result
                ],
            )
        except MediaNotFoundError as e:
            raise HTTPException(status.HTTP_404_NOT_FOUND, str(e)) from e

    @router.post(
        "/{media_id}/multipart/complete",
        response_model=MediaResponse,
        operation_id="complete_multipart_upload",
        dependencies=[Depends(require_csrf_for_cookie)],
    )
    async def complete_multipart(
        project_id: UUID,
        media_id: UUID,
        payload: CompleteMultipartUploadRequest,
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
            media = await CompleteMultipartMediaUpload(
                repository=media_repository,
                storage=storage,
                job_publisher=publisher,
            ).execute(
                organization_id=context.organization_id,
                project_id=project_id,
                media_id=media_id,
                upload_id=payload.upload_id,
                parts=[p.model_dump() for p in payload.parts],
            )
            return await to_media_response(media, storage)
        except MediaNotFoundError as e:
            raise HTTPException(status.HTTP_404_NOT_FOUND, str(e)) from e
        except MediaUploadIncompleteError as e:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, str(e)) from e

    @router.post(
        "/{media_id}/multipart/abort",
        response_model=AbortMultipartUploadResponse,
        operation_id="abort_multipart_upload",
        dependencies=[Depends(require_csrf_for_cookie)],
    )
    async def abort_multipart(
        project_id: UUID,
        media_id: UUID,
        payload: AbortMultipartUploadRequest,
        context: Annotated[OrganizationContext, Depends(organization_context_provider)],
        media_repository: Annotated[MediaRepository, Depends(media_repository_provider)],
        project_repository: Annotated[ProjectRepository, Depends(project_repository_provider)],
        storage: Annotated[StorageService, Depends(storage_service_provider)],
    ) -> AbortMultipartUploadResponse:
        await _verify_project_access(context, project_repository, project_id)
        try:
            await AbortMultipartUpload(media_repository, storage).execute(
                organization_id=context.organization_id,
                project_id=project_id,
                media_id=media_id,
                upload_id=payload.upload_id,
            )
            return AbortMultipartUploadResponse(
                media_id=media_id,
                status="aborted",
            )
        except MediaNotFoundError as e:
            raise HTTPException(status.HTTP_404_NOT_FOUND, str(e)) from e

    return router
