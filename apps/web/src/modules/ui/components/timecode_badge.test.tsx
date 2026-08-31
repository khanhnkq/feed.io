import { describe, expect, it } from "vitest";
import {
  getTimecodeBadgeClassName,
  timecodeBadgeSizeClasses,
  timecodeBadgeVariantClasses,
} from "./timecode_badge";

describe("TimecodeBadge Style Helpers", () => {
  it("generates default class with font-mono and border-line", () => {
    const className = getTimecodeBadgeClassName("md", "default");
    expect(className).toContain("font-mono");
    expect(className).toContain("border-line");
    expect(className).toContain("hover:bg-surface");
  });

  it("handles lime variant with neo-brutalist shadow", () => {
    const className = getTimecodeBadgeClassName("md", "lime");
    expect(className).toContain("bg-lime");
    expect(className).toContain("border-ink");
    expect(className).toContain("shadow-[2px_2px_0_#11130f]");
  });

  it("maps size classes properly", () => {
    expect(timecodeBadgeSizeClasses.sm).toContain("text-[10px]");
    expect(timecodeBadgeSizeClasses.md).toContain("text-[11px]");
    expect(timecodeBadgeSizeClasses.lg).toContain("text-xs");
  });

  it("maps variant classes properly", () => {
    expect(timecodeBadgeVariantClasses.default).toContain("border-line");
    expect(timecodeBadgeVariantClasses.lime).toContain("bg-lime");
    expect(timecodeBadgeVariantClasses.outline).toContain("bg-transparent");
  });
});
