from dataclasses import dataclass
from datetime import datetime
from uuid import UUID


@dataclass(frozen=True, slots=True)
class MediaAsset:
    id: UUID
    organization_id: UUID
    project_id: UUID
    folder_id: UUID | None
    created_by_user_id: UUID | None
    title: str
    filename: str
    file_size_bytes: int
    mime_type: str
    storage_key: str
    status: str  # "uploading" | "processing" | "ready" | "failed"
    created_at: datetime
    updated_at: datetime
    duration_seconds: float | None = None
    width: int | None = None
    height: int | None = None
    fps: float | None = None
    thumbnail_storage_key: str | None = None
    hls_storage_key: str | None = None
    proxy_storage_key: str | None = None
    filmstrip_storage_key: str | None = None
    filmstrip_vtt_storage_key: str | None = None
    waveform_data: str | None = None
    error_message: str | None = None
    version_group_id: UUID | None = None
    version_number: int = 1
    review_status: str = "pending"  # "pending" | "in_progress" | "needs_changes" | "approved"
    reviewed_by_user_id: UUID | None = None
    reviewed_at: datetime | None = None
    deleted_at: datetime | None = None


@dataclass(frozen=True, slots=True)
class MediaReviewDecision:
    id: UUID
    organization_id: UUID
    project_id: UUID
    media_id: UUID
    user_id: UUID
    status: str  # "pending" | "in_progress" | "needs_changes" | "approved"
    created_at: datetime
    notes: str | None = None
    user_name: str | None = None
