import { describe, expect, it } from "vitest";
import { formatBytes, formatDuration, formatResolutionBadge } from "./media_formatters";

describe("media_formatters", () => {
  describe("formatBytes", () => {
    it("formats 0 bytes correctly", () => {
      expect(formatBytes(0)).toBe("0 B");
    });

    it("formats kilobytes and megabytes", () => {
      expect(formatBytes(1024)).toBe("1 KB");
      expect(formatBytes(1048576)).toBe("1 MB");
      expect(formatBytes(52428800)).toBe("50 MB");
      expect(formatBytes(1073741824)).toBe("1 GB");
    });
  });

  describe("formatDuration", () => {
    it("handles null or undefined", () => {
      expect(formatDuration(null)).toBe("--:--");
      expect(formatDuration(undefined)).toBe("--:--");
    });

    it("formats minutes and seconds", () => {
      expect(formatDuration(65)).toBe("01:05");
      expect(formatDuration(599)).toBe("09:59");
    });

    it("formats hours, minutes, and seconds", () => {
      expect(formatDuration(3665)).toBe("1:01:05");
    });
  });

  describe("formatResolutionBadge", () => {
    it("returns null for missing dimensions", () => {
      expect(formatResolutionBadge(null, null)).toBeNull();
    });

    it("returns resolution badges", () => {
      expect(formatResolutionBadge(3840, 2160)).toBe("4K UHD");
      expect(formatResolutionBadge(1920, 1080)).toBe("1080p FHD");
      expect(formatResolutionBadge(1280, 720)).toBe("720p HD");
      expect(formatResolutionBadge(854, 480)).toBe("480p");
    });
  });
});
