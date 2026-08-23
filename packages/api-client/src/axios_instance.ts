import axios, { type AxiosError, type AxiosRequestConfig } from "axios";

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
  requestId?: string;
  status: number;
}

const DEMO_ORGANIZATION_ID = "11111111-1111-4111-8111-111111111111";

const client = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000",
  timeout: 15_000,
  headers: { Accept: "application/json" },
});

client.interceptors.request.use((config) => {
  config.headers.set("X-Organization-Id", DEMO_ORGANIZATION_ID);
  config.headers.set("X-Request-Id", globalThis.crypto?.randomUUID?.() ?? "web-request");
  return config;
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

  const axiosError = error as AxiosError<{ code?: string; message?: string; request_id?: string }>;
  return {
    code: axiosError.response?.data?.code ?? "request_failed",
    message: axiosError.response?.data?.message ?? axiosError.message,
    requestId: axiosError.response?.data?.request_id,
    status: axiosError.response?.status ?? 0,
  };
}
