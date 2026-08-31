/**
 * Type-safe Frontend Environment Configuration.
 * All environment variables are read from process.env (NEXT_PUBLIC_*) with validated defaults.
 */

export const envConfig = {
  // 1. API & WebSocket URLs
  apiUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
  wsUrl:
    process.env.NEXT_PUBLIC_WS_URL ||
    (process.env.NEXT_PUBLIC_API_URL
      ? process.env.NEXT_PUBLIC_API_URL.replace(/^http/, "ws")
      : "ws://localhost:8000"),

  // 2. Platform Branding & Environment
  appName: process.env.NEXT_PUBLIC_APP_NAME || "Feed.io",
  appEnv: process.env.NEXT_PUBLIC_APP_ENV || process.env.NODE_ENV || "development",
  isProduction: process.env.NODE_ENV === "production",

  // 3. Media Upload Configurations
  defaultPartSizeBytes: Number(process.env.NEXT_PUBLIC_DEFAULT_PART_SIZE_BYTES) || 20 * 1024 * 1024, // 20 MB
  multipartThresholdBytes:
    Number(process.env.NEXT_PUBLIC_MULTIPART_THRESHOLD_BYTES) || 50 * 1024 * 1024, // 50 MB
  maxSingleFileSizeBytes:
    Number(process.env.NEXT_PUBLIC_MAX_SINGLE_FILE_SIZE_BYTES) || 50 * 1024 * 1024 * 1024, // 50 GB
  maxConcurrentPartUploads:
    Number(process.env.NEXT_PUBLIC_MAX_CONCURRENT_PART_UPLOADS) || 4,

  // 4. Real-time Collaboration Settings
  wsPingIntervalMs: Number(process.env.NEXT_PUBLIC_WS_PING_INTERVAL_MS) || 25_000,
  wsReconnectMaxDelayMs: Number(process.env.NEXT_PUBLIC_WS_RECONNECT_MAX_DELAY_MS) || 10_000,

  // 5. Observability & Diagnostics
  glitchtipDsn: process.env.NEXT_PUBLIC_GLITCHTIP_DSN || "",
} as const;

export type EnvConfig = typeof envConfig;
