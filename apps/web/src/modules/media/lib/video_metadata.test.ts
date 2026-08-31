import { describe, expect, it } from "vitest";
import {
  extractVideoMetadataAndThumbnail,
  isImageFile,
  isVideoFile,
} from "./video_metadata";

describe("Media Metadata Utilities", () => {
  it("should identify image files correctly", () => {
    const png = new File(["dummy"], "photo.png", { type: "image/png" });
    const svg = new File(["<svg></svg>"], "icon.svg", { type: "image/svg+xml" });
    const webp = new File(["dummy"], "preview.webp", { type: "image/webp" });
    const video = new File(["dummy"], "video.mp4", { type: "video/mp4" });

    expect(isImageFile(png)).toBe(true);
    expect(isImageFile(svg)).toBe(true);
    expect(isImageFile(webp)).toBe(true);
    expect(isImageFile(video)).toBe(false);
  });

  it("should identify video files correctly", () => {
    const mp4 = new File(["dummy"], "video.mp4", { type: "video/mp4" });
    const mov = new File(["dummy"], "raw.mov", { type: "video/quicktime" });
    const png = new File(["dummy"], "photo.png", { type: "image/png" });

    expect(isVideoFile(mp4)).toBe(true);
    expect(isVideoFile(mov)).toBe(true);
    expect(isVideoFile(png)).toBe(false);
  });

  it("should return empty fallback safely in test environment", async () => {
    const fakeFile = new File(["dummy content"], "test.mp4", { type: "video/mp4" });
    const result = await extractVideoMetadataAndThumbnail(fakeFile);
    expect(result).toBeDefined();
    expect(typeof result.durationSeconds).toBe("number");
    expect(typeof result.width).toBe("number");
    expect(typeof result.height).toBe("number");
  });
});
