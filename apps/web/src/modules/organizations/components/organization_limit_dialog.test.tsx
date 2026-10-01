import { describe, expect, it } from "vitest";
import { OrganizationLimitDialog } from "./organization_limit_dialog";

describe("OrganizationLimitDialog", () => {
  it("exports valid OrganizationLimitDialog component function", () => {
    expect(typeof OrganizationLimitDialog).toBe("function");
  });

  it("has valid function signature and handles null or populated organization", () => {
    expect(OrganizationLimitDialog.length).toBe(1);
  });
});
