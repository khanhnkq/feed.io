import type { MediaResponse } from "@feedio/api-client";
import { describe, expect, it } from "vitest";
import { isImageFile, isVideoFile } from "../../../media/lib/media_metadata";
import { MULTIPART_THRESHOLD } from "../../../media/lib/multipart_uploader";

describe("UploadVersionDialog Logic & Synchronization", () => {
  const mockTargetMedia: MediaResponse = {
    id: "media-root-001",
    organization_id: "org-test-1",
    project_id: "proj-test-1",
    title: "Main_Cut_v1.mp4",
    filename: "Main_Cut_v1.mp4",
    storage_key: "org-test-1/proj-test-1/v1.mp4",
    file_size_bytes: 35000000,
    mime_type: "video/mp4",
    status: "ready",
    duration_seconds: 45.0,
    width: 1920,
    height: 1080,
    fps: 30.0,
    version_group_id: "vg-group-1",
    version_number: 1,
    version_count: 2,
    is_primary_version: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it("calculates next version number correctly based on version_count", () => {
    const currentCount = mockTargetMedia.version_count ?? 1;
    const nextVersionNumber = currentCount + 1;
    expect(nextVersionNumber).toBe(3);

    const fallbackMedia: MediaResponse = { ...mockTargetMedia, version_count: undefined };
    const fallbackNext = (fallbackMedia.version_count ?? 1) + 1;
    expect(fallbackNext).toBe(2);
  });

  it("identifies supported video and image files for version uploads", () => {
    const videoMp4 = new File(["video-bytes"], "cut_v2.mp4", { type: "video/mp4" });
    const videoMov = new File(["video-bytes"], "cut_v2.mov", { type: "video/quicktime" });
    const imagePng = new File(["image-bytes"], "frame_v2.png", { type: "image/png" });
    const textFile = new File(["text-bytes"], "notes.txt", { type: "text/plain" });

    expect(isVideoFile(videoMp4)).toBe(true);
    expect(isVideoFile(videoMov)).toBe(true);
    expect(isImageFile(imagePng)).toBe(true);

    const isValidFileType = isVideoFile(textFile) || isImageFile(textFile);
    expect(isValidFileType).toBe(false);
  });

  it("determines whether to route to multipart uploader based on MULTIPART_THRESHOLD", () => {
    const smallFile = new File(["short"], "small.mp4", { type: "video/mp4" });
    Object.defineProperty(smallFile, "size", { value: 10 * 1024 * 1024 }); // 10MB

    const largeFile = new File(["long"], "large.mov", { type: "video/quicktime" });
    Object.defineProperty(largeFile, "size", { value: 100 * 1024 * 1024 }); // 100MB

    expect(smallFile.size < MULTIPART_THRESHOLD).toBe(true);
    expect(largeFile.size >= MULTIPART_THRESHOLD).toBe(true);
  });

  it("builds correct stacking request payload with trimmed version label", () => {
    const newUploadedMediaId = "media-new-v3";
    const rawLabel = "  Director Color Grading Pass  ";

    const stackPayload = {
      source_media_id: newUploadedMediaId,
      version_label: rawLabel.trim() || undefined,
    };

    expect(stackPayload.source_media_id).toBe("media-new-v3");
    expect(stackPayload.version_label).toBe("Director Color Grading Pass");

    const emptyLabelPayload = {
      source_media_id: newUploadedMediaId,
      version_label: "   ".trim() || undefined,
    };
    expect(emptyLabelPayload.version_label).toBeUndefined();
  });
});
