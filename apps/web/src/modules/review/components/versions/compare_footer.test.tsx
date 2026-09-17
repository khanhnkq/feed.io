import { describe, expect, it, vi } from "vitest";
import type { MediaResponse } from "@feedio/api-client";
import { CompareFooter } from "./compare_footer";

const mockMediaA: MediaResponse = {
  id: "med-a",
  organization_id: "org-1",
  project_id: "proj-1",
  title: "Asset_A.mp4",
  filename: "Asset_A.mp4",
  storage_key: "org-1/proj-1/med-a",
  file_size_bytes: 1000000,
  mime_type: "video/mp4",
  status: "ready",
  duration_seconds: 10,
  width: 1920,
  height: 1080,
  fps: 24,
  version_number: 1,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockMediaB: MediaResponse = {
  ...mockMediaA,
  id: "med-b",
  title: "Asset_B.mp4",
  version_number: 2,
};

const mockImageA: MediaResponse = {
  ...mockMediaA,
  id: "img-a",
  mime_type: "image/png",
  title: "Asset_A.png",
};

describe("CompareFooter Component", () => {
  it("renders correctly for video comparison mode", () => {
    const el = CompareFooter({
      isImage: false,
      mode: "side_by_side",
      onModeChange: vi.fn(),
      wipePosition: 50,
      onWipePositionChange: vi.fn(),
      mediaA: mockMediaA,
      mediaB: mockMediaB,
      isPlaying: false,
      currentTime: 5,
      totalDuration: 10,
      fps: 24,
    });

    expect(el).toBeDefined();
    expect(el.type).toBe("footer");
  });

  it("renders correctly for image comparison mode", () => {
    const el = CompareFooter({
      isImage: true,
      mode: "wipe",
      onModeChange: vi.fn(),
      wipePosition: 50,
      onWipePositionChange: vi.fn(),
      mediaA: mockImageA,
      mediaB: mockMediaB,
    });

    expect(el).toBeDefined();
    expect(el.type).toBe("footer");
  });
});
