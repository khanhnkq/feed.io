from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field



class PresignMediaUploadRequest(BaseModel):
    filename: str = Field(min_length=1, max_length=255)
    file_size_bytes: int = Field(ge=1)
    mime_type: str = Field(min_length=3, max_length=100)
    folder_id: UUID | None = None
    duration_seconds: float | None = None
    width: int | None = None
    height: int | None = None
    has_thumbnail: bool = False


class PresignMediaUploadResponse(BaseModel):
    media_id: UUID
    upload_url: str
    storage_key: str
    thumbnail_upload_url: str | None = None
    thumbnail_storage_key: str | None = None


class UpdateMediaRequest(BaseModel):
    title: str = Field(min_length=1, max_length=255)


class MoveMediaRequest(BaseModel):
    target_folder_id: UUID | None = None


class MediaResponse(BaseModel):
    id: UUID
    organization_id: UUID
    project_id: UUID
    folder_id: UUID | None = None
    created_by_user_id: UUID | None = None
    title: str
    filename: str
    file_size_bytes: int
    mime_type: str
    storage_key: str
    thumbnail_storage_key: str | None = None
    thumbnail_url: str | None = None
    hls_storage_key: str | None = None
    hls_stream_url: str | None = None
    proxy_storage_key: str | None = None
    proxy_url: str | None = None
    filmstrip_storage_key: str | None = None
    filmstrip_url: str | None = None
    filmstrip_vtt_storage_key: str | None = None
    filmstrip_vtt_url: str | None = None
    stream_url: str | None = None
    waveform_data: str | None = None
    status: str
    duration_seconds: float | None = None
    width: int | None = None
    height: int | None = None
    fps: float | None = None
    error_message: str | None = None
    version_group_id: UUID | None = None
    version_number: int = 1
    review_status: str = "pending"
    reviewed_by_user_id: UUID | None = None
    reviewed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class TranscodeProgressResponse(BaseModel):
    media_id: UUID
    status: str
    progress_percent: int
    current_stage: str | None = None


class MediaStreamResponse(BaseModel):
    media: MediaResponse
    stream_url: str


class ThumbnailResponse(BaseModel):
    thumbnail_url: str


class InitiateMultipartUploadRequest(BaseModel):
    filename: str = Field(min_length=1, max_length=255)
    file_size_bytes: int = Field(ge=1)
    mime_type: str = Field(min_length=3, max_length=100)
    folder_id: UUID | None = None
    duration_seconds: float | None = None
    width: int | None = None
    height: int | None = None
    has_thumbnail: bool = False
    part_size_bytes: int = Field(default=20 * 1024 * 1024, ge=5 * 1024 * 1024)


class InitiateMultipartUploadResponse(BaseModel):
    media_id: UUID
    upload_id: str
    storage_key: str
    part_size_bytes: int
    total_parts: int
    thumbnail_upload_url: str | None = None
    thumbnail_storage_key: str | None = None


class PresignMultipartPartsRequest(BaseModel):
    upload_id: str
    part_numbers: list[int] = Field(min_length=1)


class MultipartPartPresignedUrl(BaseModel):
    part_number: int
    upload_url: str


class PresignMultipartPartsResponse(BaseModel):
    parts: list[MultipartPartPresignedUrl]


class MultipartPartETag(BaseModel):
    part_number: int
    etag: str


class CompleteMultipartUploadRequest(BaseModel):
    upload_id: str
    parts: list[MultipartPartETag] = Field(min_length=1)


class AbortMultipartUploadRequest(BaseModel):
    upload_id: str


class AbortMultipartUploadResponse(BaseModel):
    status: str = "aborted"
    media_id: UUID


class CreateMediaDecisionRequest(BaseModel):
    status: str = Field(pattern="^(pending|in_progress|needs_changes|approved)$")
    notes: str | None = Field(default=None, max_length=2000)


class MediaDecisionResponse(BaseModel):
    id: UUID
    organization_id: UUID
    project_id: UUID
    media_id: UUID
    user_id: UUID
    user_name: str | None = None
    status: str
    notes: str | None = None
    created_at: datetime


class MediaDecisionListResponse(BaseModel):
    items: list[MediaDecisionResponse]


class CreateShareLinkRequest(BaseModel):
    passphrase: str | None = Field(default=None, max_length=128)
    expires_in_days: int | None = Field(default=None, ge=1, le=365)
    allow_comments: bool = True
    allow_approval: bool = True
    allow_download: bool = False


class ShareLinkResponse(BaseModel):
    id: UUID
    organization_id: UUID
    project_id: UUID
    media_id: UUID | None = None
    folder_id: UUID | None = None
    created_by_user_id: UUID
    allow_comments: bool
    allow_approval: bool
    allow_download: bool
    has_passphrase: bool
    expires_at: datetime | None = None
    access_count: int
    is_revoked: bool
    created_at: datetime
    share_url: str | None = None


class CreateShareLinkResponse(BaseModel):
    id: UUID
    share_url: str
    raw_token: str
    allow_comments: bool
    allow_approval: bool
    allow_download: bool
    has_passphrase: bool
    expires_at: datetime | None = None
    created_at: datetime


class PublicShareDetailsResponse(BaseModel):
    media_id: UUID
    title: str
    filename: str
    duration_seconds: float | None = None
    fps: float | None = None
    width: int | None = None
    height: int | None = None
    mime_type: str
    review_status: str
    has_passphrase: bool
    is_authenticated: bool = True
    allow_comments: bool
    allow_approval: bool
    allow_download: bool
    thumbnail_url: str | None = None
    waveform_data: str | None = None


class VerifySharePassphraseRequest(BaseModel):
    passphrase: str = Field(min_length=1, max_length=128)


class VerifySharePassphraseResponse(BaseModel):
    success: bool
    guest_token: str | None = None


class GuestCommentRequest(BaseModel):
    guest_name: str = Field(min_length=1, max_length=100)
    guest_email: str | None = None
    content: str = Field(min_length=1, max_length=5000)
    timestamp_seconds: float | None = None
    frame_number: int | None = None
    annotation_data: dict[str, Any] | None = None
    parent_comment_id: UUID | None = None


class GuestDecisionRequest(BaseModel):
    guest_name: str = Field(min_length=1, max_length=100)
    status: str = Field(pattern="^(pending|in_progress|needs_changes|approved)$")
    notes: str | None = Field(default=None, max_length=2000)

