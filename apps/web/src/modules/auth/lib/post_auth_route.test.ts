import { describe, expect, it } from "vitest";

import { getPostAuthRoute } from "./post_auth_route";

describe("getPostAuthRoute", () => {
  it("sends accounts without a workspace to onboarding", () => {
    expect(getPostAuthRoute(false)).toBe("/onboarding");
  });

  it("sends workspace members to the workspace dashboard", () => {
    expect(getPostAuthRoute(true)).toBe("/dashboard");
  });
});
