/**
 * Platform Admin Panel Type Definitions
 * Covers users, organizations, system health, platform metrics, and audit logs.
 */

export type AdminPlatformRole = "user" | "support" | "super_admin";

export type AdminUserStatus = "active" | "suspended";

export interface AdminUser {
  id: string;
  email: string;
  display_name: string;
  avatar_url: string | null;
  platform_role: AdminPlatformRole;
  status: AdminUserStatus;
  organizations_count: number;
  created_at: string;
  last_active_at: string;
}

export type AdminOrganizationPlan = "free" | "pro" | "enterprise";

export interface AdminOrganization {
  id: string;
  name: string;
  slug: string;
  plan_tier: AdminOrganizationPlan;
  storage_used_bytes: number;
  storage_limit_bytes: number;
  projects_count: number;
  members_count: number;
  created_at: string;
  owner_email: string;
}

export type ServiceStatus = "healthy" | "degraded" | "down";

export interface SystemServiceHealth {
  name: string;
  description: string;
  status: ServiceStatus;
  latency_ms: number;
  details: string;
  updated_at: string;
}

export interface StorageBreakdown {
  raw_uploads_bytes: number;
  proxies_bytes: number;
  waveforms_bytes: number;
  cache_bytes: number;
}

export interface PlatformMetrics {
  total_users: number;
  active_organizations: number;
  total_storage_bytes: number;
  storage_capacity_bytes: number;
  total_projects: number;
  total_media_files: number;
  transcoding_queue_depth: number;
  requests_per_minute: number;
  blocked_rate_limit_requests: number;
  storage_breakdown: StorageBreakdown;
}

export type AuditLogAction =
  | "USER_ROLE_CHANGED"
  | "USER_SUSPENDED"
  | "USER_ACTIVATED"
  | "STORAGE_QUOTA_INCREASED"
  | "RATE_LIMIT_BLOCKED"
  | "ORGANIZATION_CREATED"
  | "PASSWORD_RESET_TRIGGERED";

export type AuditLogStatus = "success" | "blocked" | "warning";

export interface AdminAuditLog {
  id: string;
  timestamp: string;
  actor_email: string;
  actor_role: AdminPlatformRole;
  action: AuditLogAction;
  target_type: "user" | "organization" | "system";
  target_name: string;
  details: string;
  ip_address: string;
  status: AuditLogStatus;
}
