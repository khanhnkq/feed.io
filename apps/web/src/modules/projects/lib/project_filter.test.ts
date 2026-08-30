import type { FolderResponse, ProjectResponse } from "@feedio/api-client";
import { describe, expect, it } from "vitest";

import {
  filterFolders,
  filterProjects,
  sortFolders,
  sortProjects,
} from "./project_filter";

const projects: ProjectResponse[] = [
  {
    id: "1",
    organization_id: "agency",
    name: "Summer Campaign",
    description: "Social cutdowns",
    visibility: "public",
    created_at: "2026-08-23T00:00:00Z",
  },
  {
    id: "2",
    organization_id: "agency",
    name: "Product film",
    description: "Launch master",
    visibility: "private",
    created_at: "2026-08-24T00:00:00Z",
  },
  {
    id: "3",
    organization_id: "agency",
    name: "Alpha Teaser",
    description: "Teaser video",
    visibility: "public",
    created_at: "2026-08-20T00:00:00Z",
  },
];

const folders: FolderResponse[] = [
  {
    id: "f1",
    organization_id: "agency",
    project_id: "1",
    parent_id: null,
    name: "VFX Shots",
    created_at: "2026-08-22T00:00:00Z",
    updated_at: "2026-08-22T00:00:00Z",
  },
  {
    id: "f2",
    organization_id: "agency",
    project_id: "1",
    parent_id: null,
    name: "Audio Cuts",
    created_at: "2026-08-25T00:00:00Z",
    updated_at: "2026-08-25T00:00:00Z",
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

  it("filters by privacy mode", () => {
    expect(filterProjects(projects, "", "public")).toEqual([
      projects[0],
      projects[2],
    ]);
    expect(filterProjects(projects, "", "private")).toEqual([projects[1]]);
  });
});

describe("sortProjects", () => {
  it("sorts by name A-Z", () => {
    const sorted = sortProjects(projects, "name_asc");
    expect(sorted.map((p) => p.name)).toEqual([
      "Alpha Teaser",
      "Product film",
      "Summer Campaign",
    ]);
  });

  it("sorts by name Z-A", () => {
    const sorted = sortProjects(projects, "name_desc");
    expect(sorted.map((p) => p.name)).toEqual([
      "Summer Campaign",
      "Product film",
      "Alpha Teaser",
    ]);
  });

  it("sorts by created date newest first", () => {
    const sorted = sortProjects(projects, "created_desc");
    expect(sorted.map((p) => p.id)).toEqual(["2", "1", "3"]);
  });

  it("sorts by created date oldest first", () => {
    const sorted = sortProjects(projects, "created_asc");
    expect(sorted.map((p) => p.id)).toEqual(["3", "1", "2"]);
  });
});

describe("filterFolders and sortFolders", () => {
  it("filters folders by search query", () => {
    expect(filterFolders(folders, "vfx")).toEqual([folders[0]]);
    expect(filterFolders(folders, "")).toEqual(folders);
  });

  it("sorts folders by name A-Z and date", () => {
    expect(sortFolders(folders, "name_asc").map((f) => f.name)).toEqual([
      "Audio Cuts",
      "VFX Shots",
    ]);
    expect(sortFolders(folders, "created_desc").map((f) => f.id)).toEqual([
      "f2",
      "f1",
    ]);
  });
});
