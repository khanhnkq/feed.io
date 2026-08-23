import axios, {
  type AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from "axios";

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
  requestId?: string;
  status: number;
}

const client = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000",
  timeout: 15_000,
  withCredentials: true,
  headers: { Accept: "application/json" },
});
let refreshRequest: Promise<void> | undefined;

client.interceptors.request.use((config) => {
  config.headers.set("X-Request-Id", globalThis.crypto?.randomUUID?.() ?? "web-request");
  const csrfToken = readCookie("feedio_csrf_token");
  if (csrfToken) {
    config.headers.set("X-CSRF-Token", csrfToken);
  }
  return config;
});

client.interceptors.response.use(undefined, async (error: unknown) => {
  if (!axios.isAxiosError(error) || error.response?.status !== 401 || !error.config) {
    throw error;
  }
  const config = error.config as RetryableRequestConfig;
  if (config._feedioRetried || isRefreshExcluded(config.url) || !readCookie("feedio_csrf_token")) {
    throw error;
  }
  config._feedioRetried = true;
  refreshRequest ??= client
    .post("/api/v1/auth/refresh", undefined, { adapter: config.adapter })
    .then(() => undefined)
    .finally(() => {
      refreshRequest = undefined;
    });
  await refreshRequest;
  return client.request(config);
});

export async function axiosInstance<T>(
  config: AxiosRequestConfig,
  options?: AxiosRequestConfig,
): Promise<T> {
  try {
    const response = await client.request<T>({ ...config, ...options });
    return response.data;
  } catch (error) {
    throw normalizeApiError(error);
  }
}

function normalizeApiError(error: unknown): ApiError {
  if (!axios.isAxiosError(error)) {
    return { code: "unknown_error", message: "An unexpected error occurred", status: 500 };
  }

  const axiosError = error as AxiosError<{
    code?: string;
    detail?: string;
    message?: string;
    request_id?: string;
  }>;
  return {
    code: axiosError.response?.data?.code ?? "request_failed",
    message:
      axiosError.response?.data?.message ??
      axiosError.response?.data?.detail ??
      axiosError.message,
    requestId: axiosError.response?.data?.request_id,
    status: axiosError.response?.status ?? 0,
  };
}

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") {
    return undefined;
  }
  const prefix = `${name}=`;
  const cookie = document.cookie.split("; ").find((item) => item.startsWith(prefix));
  return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : undefined;
}

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _feedioRetried?: boolean;
}

function isRefreshExcluded(url: string | undefined): boolean {
  return [
    "/auth/register",
    "/auth/verify-email",
    "/auth/resend-verification",
    "/auth/login",
    "/auth/refresh",
    "/auth/logout",
    "/auth/forgot-password",
    "/auth/reset-password",
  ].some((path) => url?.includes(path));
}
