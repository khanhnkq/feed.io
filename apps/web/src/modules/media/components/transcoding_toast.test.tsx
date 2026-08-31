import type { MediaResponse } from "@feedio/api-client";
import { describe, expect, it } from "vitest";
import { filterProcessingMedia, getTranscodeToastTitle } from "./transcoding_toast";

describe("TranscodingToast Helper Functions", () => {
  const mockMedia: MediaResponse = {
    id: "media-123",
    organization_id: "org-123",
    project_id: "proj-123",
    title: "Cinematic Trailer",
    filename: "trailer.mp4",
    file_size_bytes: 15_000_000,
    mime_type: "video/mp4",
    storage_key: "org/proj/media/media-123/trailer.mp4",
    status: "processing",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it("filters only processing media items", () => {
    const list: MediaResponse[] = [
      mockMedia,
      { ...mockMedia, id: "media-ready", status: "ready" },
      { ...mockMedia, id: "media-failed", status: "failed" },
    ];
    const result = filterProcessingMedia(list, new Set());
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("media-123");
  });

  it("excludes dismissed media items", () => {
    const list: MediaResponse[] = [mockMedia];
    const result = filterProcessingMedia(list, new Set(["media-123"]));
    expect(result).toHaveLength(0);
  });

  it("generates correct toast title for single and multiple transcoding jobs", () => {
    expect(getTranscodeToastTitle(1, "Cinematic Cut")).toBe("Cinematic Cut");
    expect(getTranscodeToastTitle(1)).toBe("1 Video Transcoding");
    expect(getTranscodeToastTitle(3)).toBe("3 Videos Transcoding");
  });
});
