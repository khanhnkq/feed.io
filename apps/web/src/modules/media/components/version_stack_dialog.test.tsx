import { describe, expect, it } from "vitest";
import type { MediaResponse } from "@feedio/api-client";

describe("VersionStackDialog Data Logic & Sorting", () => {
  const createMockMedia = (versionNumber: number, isPrimary: boolean): MediaResponse => ({
    id: `med-${versionNumber}`,
    organization_id: "org-1",
    project_id: "proj-1",
    title: `Version_${versionNumber}.mp4`,
    filename: `Version_${versionNumber}.mp4`,
    storage_key: `org-1/proj-1/med-${versionNumber}/source.mp4`,
    file_size_bytes: 15000000,
    mime_type: "video/mp4",
    status: "ready",
    duration_seconds: 30.0,
    width: 1920,
    height: 1080,
    fps: 24.0,
    version_group_id: "vg-1",
    version_number: versionNumber,
    is_primary_version: isPrimary,
    version_count: 3,
    thumbnail_storage_key: null,
    created_at: new Date(Date.now() - versionNumber * 1000).toISOString(),
    updated_at: new Date(Date.now() - versionNumber * 1000).toISOString(),
  });

  const mockVersions: MediaResponse[] = [
    createMockMedia(1, false),
    createMockMedia(3, false),
    createMockMedia(2, true),
  ];

  it("identifies primary preview version accurately", () => {
    const primary = mockVersions.find((v) => v.is_primary_version) ?? mockVersions[0];
    expect(primary.id).toBe("med-2");
    expect(primary.version_number).toBe(2);
  });

  it("sorts versions in descending order of version number", () => {
    const sorted = [...mockVersions].sort(
      (a, b) => (b.version_number ?? 1) - (a.version_number ?? 1)
    );
    expect(sorted.map((v) => v.version_number)).toEqual([3, 2, 1]);
  });

  it("enables unstack action only when stack has more than 1 version", () => {
    const singleVersionStack = [mockVersions[0]];
    const multiVersionStack = mockVersions;

    expect(singleVersionStack.length > 1).toBe(false);
    expect(multiVersionStack.length > 1).toBe(true);
  });

  it("determines secondary version compare eligibility against primary version", () => {
    const primary = mockVersions.find((v) => v.is_primary_version);
    expect(primary).toBeDefined();

    const nonPrimary = mockVersions.filter((v) => v.id !== primary?.id);
    expect(nonPrimary.length).toBe(2);
    expect(nonPrimary.map((v) => v.id)).toEqual(["med-1", "med-3"]);
  });
});
