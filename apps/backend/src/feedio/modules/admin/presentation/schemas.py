from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class StorageBreakdownResponse(BaseModel):
    raw_uploads_bytes: int = Field(..., description="Raw video footage bytes")
    proxies_bytes: int = Field(..., description="Transcoded proxy stream bytes")
    waveforms_bytes: int = Field(..., description="Audio waveform cache bytes")
    cache_bytes: int = Field(..., description="Thumbnail & temporary cache bytes")


class PlatformMetricsResponse(BaseModel):
    total_users: int = Field(..., description="Total registered accounts")
    active_organizations: int = Field(..., description="Total active organizations")
    total_storage_bytes: int = Field(..., description="Total storage consumed across all orgs")
    storage_capacity_bytes: int = Field(..., description="Total allocated storage capacity")
    total_projects: int = Field(..., description="Total projects created")
    total_media_files: int = Field(..., description="Total uploaded media assets")
    transcoding_queue_depth: int = Field(default=0, description="Jobs waiting in transcoding queue")
    requests_per_minute: int = Field(default=24, description="Average API throughput")
    blocked_rate_limit_requests: int = Field(default=0, description="Blocked abusive requests")
    storage_breakdown: StorageBreakdownResponse


class SystemServiceHealthResponse(BaseModel):
    name: str
    description: str
    status: str = Field(..., description="'healthy' | 'degraded' | 'down'")
    latency_ms: float
    details: str
    updated_at: datetime


class AdminOverviewResponse(BaseModel):
    metrics: PlatformMetricsResponse
    system_health: list[SystemServiceHealthResponse]


class AdminUserResponse(BaseModel):
    id: UUID
    email: str
    display_name: str
    avatar_url: str | None = None
    platform_role: str = Field(..., description="'user' | 'support' | 'super_admin'")
    status: str = Field(..., description="'active' | 'suspended'")
    organizations_count: int
    created_at: datetime
    last_active_at: datetime


class UpdateUserRoleRequest(BaseModel):
    new_role: str = Field(..., description="'user' | 'support' | 'super_admin'")


class UpdateUserStatusRequest(BaseModel):
    new_status: str = Field(..., description="'active' | 'suspended'")


class AdminOrganizationResponse(BaseModel):
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


class UpdateOrganizationQuotaRequest(BaseModel):
    new_quota_bytes: int = Field(..., gt=0, description="New quota limit in bytes")


class AdminAuditLogResponse(BaseModel):
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
