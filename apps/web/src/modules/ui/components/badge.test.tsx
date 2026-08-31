import { describe, expect, it } from "vitest";
import { Badge, badgeSizeClasses, badgeVariantClasses } from "./badge";

describe("Badge Component", () => {
  it("renders children correctly as a span element", () => {
    const el = Badge({ children: "1080P" });
    expect(el.props.children).toContain("1080P");
    expect(el.props.className).toContain("bg-surface");
  });

  it("applies variant classes properly", () => {
    expect(badgeVariantClasses.lime).toContain("bg-lime");
    expect(badgeVariantClasses.ink).toContain("bg-ink");
    expect(badgeVariantClasses.danger).toContain("bg-red-50");
    expect(badgeVariantClasses.success).toContain("bg-lime/20");
  });

  it("applies size classes properly", () => {
    expect(badgeSizeClasses.sm).toContain("text-[10px]");
    expect(badgeSizeClasses.md).toContain("text-xs");
    expect(badgeSizeClasses.lg).toContain("text-xs");
  });
});
