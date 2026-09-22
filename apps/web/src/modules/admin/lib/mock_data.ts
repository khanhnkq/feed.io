import type {
  AdminAuditLog,
  AdminOrganization,
  AdminUser,
  PlatformMetrics,
  SystemServiceHealth,
} from "../types";

export const mockAdminUsers: AdminUser[] = [
  {
    id: "usr_01",
    email: "khanh@creativecut.studio",
    display_name: "Khanh Nguyen",
    avatar_url:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80",
    platform_role: "super_admin",
    status: "active",
    organizations_count: 3,
    created_at: "2026-01-10T08:00:00Z",
    last_active_at: "2026-09-22T13:45:00Z",
  },
  {
    id: "usr_02",
    email: "support.team@feed.io",
    display_name: "Sarah Jenkins",
    avatar_url:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80",
    platform_role: "support",
    status: "active",
    organizations_count: 1,
    created_at: "2026-02-14T09:30:00Z",
    last_active_at: "2026-09-22T12:15:00Z",
  },
  {
    id: "usr_03",
    email: "director@neonframes.com",
    display_name: "Marcus Vance",
    avatar_url: null,
    platform_role: "user",
    status: "active",
    organizations_count: 2,
    created_at: "2026-03-01T11:20:00Z",
    last_active_at: "2026-09-21T18:00:00Z",
  },
  {
    id: "usr_04",
    email: "editor.alex@cinemotion.io",
    display_name: "Alex Rivera",
    avatar_url:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80",
    platform_role: "user",
    status: "active",
    organizations_count: 1,
    created_at: "2026-04-12T14:10:00Z",
    last_active_at: "2026-09-20T16:30:00Z",
  },
  {
    id: "usr_05",
    email: "spammer@unverified-bot.xyz",
    display_name: "Suspicious Account",
    avatar_url: null,
    platform_role: "user",
    status: "suspended",
    organizations_count: 0,
    created_at: "2026-09-15T02:00:00Z",
    last_active_at: "2026-09-15T02:15:00Z",
  },
  {
    id: "usr_06",
    email: "clara.color@postpro.uk",
    display_name: "Clara Oswald",
    avatar_url:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80",
    platform_role: "support",
    status: "active",
    organizations_count: 4,
    created_at: "2026-05-18T10:00:00Z",
    last_active_at: "2026-09-22T08:50:00Z",
  },
  {
    id: "usr_07",
    email: "vfx.supervisor@apexeffects.ca",
    display_name: "David Zhao",
    avatar_url: null,
    platform_role: "user",
    status: "active",
    organizations_count: 1,
    created_at: "2026-06-25T16:45:00Z",
    last_active_at: "2026-09-19T22:10:00Z",
  },
];

export const mockAdminOrganizations: AdminOrganization[] = [
  {
    id: "org_01",
    name: "Creative Cut Studio",
    slug: "creative-cut-studio",
    plan_tier: "enterprise",
    storage_used_bytes: 420 * 1024 * 1024 * 1024, // 420 GB
    storage_limit_bytes: 1024 * 1024 * 1024 * 1024, // 1 TB
    projects_count: 28,
    members_count: 14,
    created_at: "2026-01-12T10:00:00Z",
    owner_email: "khanh@creativecut.studio",
  },
  {
    id: "org_02",
    name: "Neon Frames Production",
    slug: "neon-frames",
    plan_tier: "pro",
    storage_used_bytes: 230 * 1024 * 1024 * 1024, // 230 GB
    storage_limit_bytes: 250 * 1024 * 1024 * 1024, // 250 GB (92% used!)
    projects_count: 12,
    members_count: 6,
    created_at: "2026-03-02T14:30:00Z",
    owner_email: "director@neonframes.com",
  },
  {
    id: "org_03",
    name: "CineMotion Labs",
    slug: "cinemotion-labs",
    plan_tier: "pro",
    storage_used_bytes: 85 * 1024 * 1024 * 1024, // 85 GB
    storage_limit_bytes: 250 * 1024 * 1024 * 1024, // 250 GB
    projects_count: 8,
    members_count: 4,
    created_at: "2026-04-15T09:15:00Z",
    owner_email: "editor.alex@cinemotion.io",
  },
  {
    id: "org_04",
    name: "Indie Docs Guild",
    slug: "indie-docs-guild",
    plan_tier: "free",
    storage_used_bytes: 18 * 1024 * 1024 * 1024, // 18 GB
    storage_limit_bytes: 20 * 1024 * 1024 * 1024, // 20 GB (90% used)
    projects_count: 3,
    members_count: 2,
    created_at: "2026-07-01T12:00:00Z",
    owner_email: "docs@indieguild.org",
  },
  {
    id: "org_05",
    name: "Apex Effects Studio",
    slug: "apex-effects",
    plan_tier: "enterprise",
    storage_used_bytes: 680 * 1024 * 1024 * 1024, // 680 GB
    storage_limit_bytes: 2048 * 1024 * 1024 * 1024, // 2 TB
    projects_count: 35,
    members_count: 22,
    created_at: "2026-06-26T18:20:00Z",
    owner_email: "vfx.supervisor@apexeffects.ca",
  },
];

export const mockSystemHealth: SystemServiceHealth[] = [
  {
    name: "PostgreSQL Database",
    description: "Primary transactional data store with connection pooling",
    status: "healthy",
    latency_ms: 1.2,
    details: "18 active pools, 0 connection timeouts, 99.99% uptime",
    updated_at: "2026-09-22T13:54:00Z",
  },
  {
    name: "Valkey In-Memory Cache & Limiter",
    description: "Sliding-window rate limiter & session state storage",
    status: "healthy",
    latency_ms: 0.4,
    details: "Memory: 142MB/2GB, 0 evictions, throughput: 1.8k ops/sec",
    updated_at: "2026-09-22T13:54:00Z",
  },
  {
    name: "Garage S3 Object Storage",
    description: "Distributed cluster for raw footage & transcoded HLS stream files",
    status: "healthy",
    latency_ms: 4.8,
    details: "3 active nodes, read latency 4.8ms, 1.43 TB stored",
    updated_at: "2026-09-22T13:54:00Z",
  },
  {
    name: "RabbitMQ Message Broker",
    description: "Distributed async queue for video transcoding & webhook dispatch",
    status: "healthy",
    latency_ms: 2.1,
    details: "0 dead-letter drops, queue depth: 2 jobs pending",
    updated_at: "2026-09-22T13:54:00Z",
  },
  {
    name: "Cloudflare Tunnel Ingress Gateway",
    description: "Zero-trust ingress tunnel with automated Edge SSL & DDoS protection",
    status: "healthy",
    latency_ms: 0.8,
    details: "QUIC/TLS tunnel active, zero inbound ports exposed",
    updated_at: "2026-09-22T13:54:00Z",
  },
];

export const mockPlatformMetrics: PlatformMetrics = {
  total_users: 1420,
  active_organizations: 184,
  total_storage_bytes: 1433 * 1024 * 1024 * 1024, // 1.43 TB
  storage_capacity_bytes: 10 * 1024 * 1024 * 1024 * 1024, // 10 TB
  total_projects: 862,
  total_media_files: 5410,
  transcoding_queue_depth: 2,
  requests_per_minute: 1240,
  blocked_rate_limit_requests: 14,
  storage_breakdown: {
    raw_uploads_bytes: 890 * 1024 * 1024 * 1024, // 890 GB
    proxies_bytes: 420 * 1024 * 1024 * 1024, // 420 GB
    waveforms_bytes: 35 * 1024 * 1024 * 1024, // 35 GB
    cache_bytes: 88 * 1024 * 1024 * 1024, // 88 GB
  },
};

export const mockAdminAuditLogs: AdminAuditLog[] = [
  {
    id: "log_01",
    timestamp: "2026-09-22T13:30:15Z",
    actor_email: "khanh@creativecut.studio",
    actor_role: "super_admin",
    action: "USER_ROLE_CHANGED",
    target_type: "user",
    target_name: "Sarah Jenkins (support.team@feed.io)",
    details: "Promoted user platform role to 'support'",
    ip_address: "118.69.12.34",
    status: "success",
  },
  {
    id: "log_02",
    timestamp: "2026-09-22T11:45:00Z",
    actor_email: "khanh@creativecut.studio",
    actor_role: "super_admin",
    action: "STORAGE_QUOTA_INCREASED",
    target_type: "organization",
    target_name: "Creative Cut Studio",
    details: "Increased storage quota limit from 500GB to 1TB",
    ip_address: "118.69.12.34",
    status: "success",
  },
  {
    id: "log_03",
    timestamp: "2026-09-22T09:12:44Z",
    actor_email: "system.edge@feed.io",
    actor_role: "super_admin",
    action: "RATE_LIMIT_BLOCKED",
    target_type: "system",
    target_name: "Client IP 185.220.101.5",
    details: "Exceeded sliding window limit (120 req/min). Returned HTTP 429 RFC 7807",
    ip_address: "185.220.101.5",
    status: "blocked",
  },
  {
    id: "log_04",
    timestamp: "2026-09-21T16:20:10Z",
    actor_email: "sarah.jenkins@feed.io",
    actor_role: "support",
    action: "USER_SUSPENDED",
    target_type: "user",
    target_name: "spammer@unverified-bot.xyz",
    details: "Automated spam reports reached threshold. Account suspended pending review",
    ip_address: "14.161.20.55",
    status: "warning",
  },
  {
    id: "log_05",
    timestamp: "2026-09-20T14:05:22Z",
    actor_email: "director@neonframes.com",
    actor_role: "user",
    action: "ORGANIZATION_CREATED",
    target_type: "organization",
    target_name: "Neon Frames Production",
    details: "Created new workspace organization on Pro plan",
    ip_address: "27.72.105.12",
    status: "success",
  },
];
