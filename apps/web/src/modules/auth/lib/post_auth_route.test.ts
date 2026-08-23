import { describe, expect, it } from "vitest";

import { getPostAuthRoute } from "./post_auth_route";

describe("getPostAuthRoute", () => {
  it("sends accounts without an organization to onboarding", () => {
    expect(getPostAuthRoute(false)).toBe("/onboarding");
  });

  it("sends organization members to the app dashboard", () => {
    expect(getPostAuthRoute(true)).toBe("/app");
  });
});
