from datetime import datetime
from typing import Any, Protocol
from uuid import UUID

from feedio.modules.media.domain.entities import (
    MediaAsset,
    MediaReviewDecision,
    ShareLink,
)
from feedio.shared.domain.pagination import Page



class StorageService(Protocol):
    async def generate_presigned_upload_url(
        self,
        storage_key: str,
        mime_type: str,
        expires_in: int = 3600,
    ) -> str: ...

    async def generate_presigned_view_url(
        self,
        storage_key: str,
        expires_in: int = 7200,
    ) -> str: ...

    async def verify_object_exists(self, storage_key: str) -> bool: ...

    async def delete_object(self, storage_key: str) -> None: ...

    async def upload_bytes(
        self,
        storage_key: str,
        data: bytes,
        mime_type: str,
    ) -> None: ...

    async def get_object_bytes(
        self,
        storage_key: str,
    ) -> bytes: ...

    async def create_multipart_upload(
        self,
        storage_key: str,
        mime_type: str,
    ) -> str: ...

    async def generate_presigned_part_url(
        self,
        storage_key: str,
        upload_id: str,
        part_number: int,
        expires_in: int = 3600,
    ) -> str: ...

    async def complete_multipart_upload(
        self,
        storage_key: str,
        upload_id: str,
        parts: list[dict[str, Any]],
    ) -> None: ...

    async def abort_multipart_upload(
        self,
        storage_key: str,
        upload_id: str,
    ) -> None: ...


class MediaRepository(Protocol):
    async def create(self, media: MediaAsset) -> MediaAsset: ...

    async def get_by_id(
        self,
        organization_id: UUID,
        project_id: UUID,
        media_id: UUID,
    ) -> MediaAsset | None: ...

    async def list_by_location(
        self,
        organization_id: UUID,
        project_id: UUID,
        folder_id: UUID | None = None,
        include_subfolders: bool = False,
        cursor: str | None = None,
        limit: int = 50,
    ) -> Page[MediaAsset]: ...

    async def update_status(
        self,
        organization_id: UUID,
        project_id: UUID,
        media_id: UUID,
        status: str,
    ) -> MediaAsset: ...

    async def update_transcode_result(
        self,
        organization_id: UUID,
        project_id: UUID,
        media_id: UUID,
        status: str,
        duration_seconds: float | None = None,
        width: int | None = None,
        height: int | None = None,
        fps: float | None = None,
        thumbnail_storage_key: str | None = None,
        hls_storage_key: str | None = None,
        proxy_storage_key: str | None = None,
        filmstrip_storage_key: str | None = None,
        filmstrip_vtt_storage_key: str | None = None,
        waveform_data: str | None = None,
        error_message: str | None = None,
    ) -> MediaAsset: ...

    async def update_metadata(
        self,
        organization_id: UUID,
        project_id: UUID,
        media_id: UUID,
        title: str,
    ) -> MediaAsset: ...

    async def move(
        self,
        organization_id: UUID,
        project_id: UUID,
        media_id: UUID,
        target_folder_id: UUID | None,
    ) -> MediaAsset: ...

    async def soft_delete(
        self,
        organization_id: UUID,
        project_id: UUID,
        media_id: UUID,
    ) -> None: ...

    async def get_organization_storage_usage_bytes(
        self,
        organization_id: UUID,
    ) -> int: ...

    async def list_incomplete_multipart_uploads(
        self,
        older_than: datetime,
    ) -> list[MediaAsset]: ...

    async def list_versions(
        self,
        organization_id: UUID,
        project_id: UUID,
        version_group_id: UUID,
    ) -> list[MediaAsset]: ...

    async def record_decision(
        self,
        decision: MediaReviewDecision,
    ) -> MediaReviewDecision: ...

    async def list_decisions(
        self,
        organization_id: UUID,
        project_id: UUID,
        media_id: UUID,
        limit: int = 50,
    ) -> list[MediaReviewDecision]: ...

    async def update_review_status(
        self,
        organization_id: UUID,
        project_id: UUID,
        media_id: UUID,
        status: str,
        reviewed_by_user_id: UUID | None,
    ) -> MediaAsset: ...

    async def create_share_link(
        self,
        share_link: ShareLink,
    ) -> ShareLink: ...

    async def get_share_link_by_id(
        self,
        organization_id: UUID,
        project_id: UUID,
        share_link_id: UUID,
    ) -> ShareLink | None: ...

    async def get_share_link_by_token_hash(
        self,
        token_hash: str,
    ) -> ShareLink | None: ...

    async def list_share_links(
        self,
        organization_id: UUID,
        project_id: UUID,
        media_id: UUID,
    ) -> list[ShareLink]: ...

    async def revoke_share_link(
        self,
        organization_id: UUID,
        project_id: UUID,
        share_link_id: UUID,
    ) -> ShareLink: ...

    async def increment_share_link_access_count(
        self,
        share_link_id: UUID,
    ) -> None: ...



class MediaJobPublisher(Protocol):
    async def publish_transcode_job(
        self,
        organization_id: UUID,
        project_id: UUID,
        media_id: UUID,
        storage_key: str,
        filename: str,
        mime_type: str,
    ) -> None: ...
