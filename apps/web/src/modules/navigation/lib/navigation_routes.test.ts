import { describe, expect, it } from "vitest";

import {
  getBreadcrumbSegments,
  getOrganizationRoute,
  getProjectDashboardRoute,
  getProjectIssuesRoute,
  getProjectKanbanRoute,
  getProjectListRoute,
} from "./navigation_routes";

describe("navigation_routes", () => {
  it("constructs organization route from slug", () => {
    expect(getOrganizationRoute("north-studio")).toBe(
      "/app/organizations/north-studio",
    );
  });

  it("constructs project list route from org slug", () => {
    expect(getProjectListRoute("north-studio")).toBe(
      "/app/organizations/north-studio/projects",
    );
  });

  it("constructs project dashboard route from org slug and project id", () => {
    expect(getProjectDashboardRoute("north-studio", "proj-123")).toBe(
      "/app/organizations/north-studio/projects/proj-123",
    );
  });

  it("constructs project kanban route from org slug and project id", () => {
    expect(getProjectKanbanRoute("north-studio", "proj-123")).toBe(
      "/app/organizations/north-studio/projects/proj-123/kanban",
    );
  });

  it("constructs project issues route from org slug and project id", () => {
    expect(getProjectIssuesRoute("north-studio", "proj-123")).toBe(
      "/app/organizations/north-studio/projects/proj-123/issues",
    );
  });

  it("builds correct breadcrumb segments across global, organization, and project contexts", () => {
    expect(getBreadcrumbSegments()).toEqual(["Self-hosted platform"]);
    expect(getBreadcrumbSegments({ name: "North Studio" })).toEqual([
      "Self-hosted platform",
      "North Studio",
    ]);
    expect(
      getBreadcrumbSegments({ name: "North Studio" }, "Brand Campaign"),
    ).toEqual(["Self-hosted platform", "North Studio", "Brand Campaign"]);
  });
});
