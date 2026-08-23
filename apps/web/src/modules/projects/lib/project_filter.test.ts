import type { ProjectResponse } from "@feedio/api-client";
import { describe, expect, it } from "vitest";

import { filterProjects } from "./project_filter";

const projects: ProjectResponse[] = [
  {
    id: "1",
    organization_id: "agency",
    name: "Summer Campaign",
    description: "Social cutdowns",
    created_at: "2026-08-23T00:00:00Z",
  },
  {
    id: "2",
    organization_id: "agency",
    name: "Product film",
    description: "Launch master",
    created_at: "2026-08-23T00:00:00Z",
  },
];

describe("filterProjects", () => {
  it("matches project names without case sensitivity", () => {
    expect(filterProjects(projects, "  SUMMER ")).toEqual([projects[0]]);
  });

  it("matches descriptions and returns all projects for a blank query", () => {
    expect(filterProjects(projects, "launch")).toEqual([projects[1]]);
    expect(filterProjects(projects, " ")).toEqual(projects);
  });
});
