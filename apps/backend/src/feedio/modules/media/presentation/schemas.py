from datetime import datetime
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
    stream_url: str | None = None
    waveform_data: str | None = None
    status: str
    duration_seconds: float | None = None
    width: int | None = None
    height: int | None = None
    fps: float | None = None
    error_message: str | None = None
    created_at: datetime
    updated_at: datetime


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
