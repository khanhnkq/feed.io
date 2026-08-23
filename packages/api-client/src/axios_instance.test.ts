import { AxiosError, type AxiosAdapter, type AxiosResponse } from "axios";
import { afterEach, describe, expect, it, vi } from "vitest";

import { axiosInstance } from "./axios_instance";

describe("axiosInstance cookie authentication", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends credentials and the double-submit CSRF header", async () => {
    vi.stubGlobal("document", { cookie: "feedio_csrf_token=csrf-123" });
    const adapter: AxiosAdapter = async (config) => {
      expect(config.withCredentials).toBe(true);
      expect(config.headers.get("X-CSRF-Token")).toBe("csrf-123");
      return {
        config,
        data: { ok: true },
        headers: {},
        status: 200,
        statusText: "OK",
      } satisfies AxiosResponse;
    };

    const result = await axiosInstance<{ ok: boolean }>({ url: "/test", adapter });

    expect(result).toEqual({ ok: true });
  });

  it("refreshes once after a 401 and retries the original request", async () => {
    vi.stubGlobal("document", { cookie: "feedio_csrf_token=csrf-123" });
    const calls: string[] = [];
    let protectedAttempts = 0;
    const adapter: AxiosAdapter = async (config) => {
      calls.push(config.url ?? "");
      if (config.url === "/api/v1/auth/refresh") {
        return response(config, 204, undefined);
      }
      protectedAttempts += 1;
      if (protectedAttempts === 1) {
        const unauthorized = response(config, 401, { message: "expired" });
        throw new AxiosError("expired", "ERR_BAD_REQUEST", config, undefined, unauthorized);
      }
      return response(config, 200, { ok: true });
    };

    const result = await axiosInstance<{ ok: boolean }>({ url: "/protected", adapter });

    expect(result).toEqual({ ok: true });
    expect(calls).toEqual(["/protected", "/api/v1/auth/refresh", "/protected"]);
  });

  it("does not attempt refresh when no browser session exists", async () => {
    vi.stubGlobal("document", { cookie: "" });
    const calls: string[] = [];
    const adapter: AxiosAdapter = async (config) => {
      calls.push(config.url ?? "");
      const unauthorized = response(config, 401, { message: "signed out" });
      throw new AxiosError("signed out", "ERR_BAD_REQUEST", config, undefined, unauthorized);
    };

    await expect(axiosInstance({ url: "/api/v1/auth/me", adapter })).rejects.toMatchObject({
      status: 401,
    });
    expect(calls).toEqual(["/api/v1/auth/me"]);
  });
});

function response<T>(
  config: Parameters<AxiosAdapter>[0],
  status: number,
  data: T,
): AxiosResponse<T> {
  return { config, data, headers: {}, status, statusText: String(status) };
}
