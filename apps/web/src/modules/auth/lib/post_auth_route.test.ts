import { describe, expect, it } from "vitest";

import { getPostAuthRedirectUrl, getPostAuthRoute } from "./post_auth_route";

describe("getPostAuthRoute", () => {
  it("sends accounts without an organization to onboarding", () => {
    expect(getPostAuthRoute(false)).toBe("/onboarding");
  });

  it("sends organization members to the app dashboard", () => {
    expect(getPostAuthRoute(true)).toBe("/app");
  });
});

describe("getPostAuthRedirectUrl", () => {
  it("always sends accounts without organization to /onboarding regardless of redirect param", () => {
    expect(getPostAuthRedirectUrl(false, "/app/organizations/acme")).toBe("/onboarding");
    expect(getPostAuthRedirectUrl(false, null)).toBe("/onboarding");
  });

  it("sends organization members to valid internal redirect target", () => {
    expect(getPostAuthRedirectUrl(true, "/app/organizations/acme/projects")).toBe(
      "/app/organizations/acme/projects",
    );
  });

  it("defaults to /app when redirect param is missing or empty", () => {
    expect(getPostAuthRedirectUrl(true, null)).toBe("/app");
    expect(getPostAuthRedirectUrl(true, undefined)).toBe("/app");
    expect(getPostAuthRedirectUrl(true, "")).toBe("/app");
  });

  it("protects against open redirect attacks and external URLs", () => {
    expect(getPostAuthRedirectUrl(true, "https://evil.com")).toBe("/app");
    expect(getPostAuthRedirectUrl(true, "//evil.com")).toBe("/app");
    expect(getPostAuthRedirectUrl(true, "javascript:alert(1)")).toBe("/app");
  });
});
