from dataclasses import dataclass
from datetime import datetime
from uuid import UUID


@dataclass(frozen=True)
class AdminUser:
    id: UUID
    email: str
    display_name: str
    avatar_url: str | None
    platform_role: str
    status: str
    organizations_count: int
    created_at: datetime
    last_active_at: datetime


@dataclass(frozen=True)
class AdminOrganization:
    id: UUID
    name: str
    slug: str
    plan_tier: str
    storage_used_bytes: int
    storage_limit_bytes: int
    projects_count: int
    members_count: int
    created_at: datetime
    owner_email: str


@dataclass(frozen=True)
class SystemServiceHealth:
    name: str
    description: str
    status: str
    latency_ms: float
    details: str
    updated_at: datetime


@dataclass(frozen=True)
class StorageBreakdown:
    raw_uploads_bytes: int
    proxies_bytes: int
    waveforms_bytes: int
    cache_bytes: int


@dataclass(frozen=True)
class PlatformMetrics:
    total_users: int
    active_organizations: int
    total_storage_bytes: int
    storage_capacity_bytes: int
    total_projects: int
    total_media_files: int
    transcoding_queue_depth: int
    requests_per_minute: int
    blocked_rate_limit_requests: int
    storage_breakdown: StorageBreakdown


@dataclass(frozen=True)
class AdminAuditLog:
    id: UUID
    timestamp: datetime
    actor_email: str
    actor_role: str
    action: str
    target_type: str
    target_name: str
    details: str
    ip_address: str
    status: str
