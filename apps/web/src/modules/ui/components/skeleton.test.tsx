import { describe, expect, it } from "vitest";
import { Skeleton, SkeletonText } from "./skeleton";

describe("Skeleton Component", () => {
  it("renders with default classes", () => {
    const el = Skeleton({});
    expect(el.props["aria-hidden"]).toBe("true");
    expect(el.props.className).toContain("bg-muted/20");
    expect(el.props.className).toContain("rounded-lg");
    expect(el.props.className).toContain("animate-pulse");
  });

  it("applies circle variant", () => {
    const el = Skeleton({ variant: "circle" });
    expect(el.props.className).toContain("rounded-full");
    expect(el.props.className).toContain("aspect-square");
  });

  it("supports disabling animation", () => {
    const el = Skeleton({ animate: false });
    expect(el.props.className).not.toContain("animate-pulse");
  });

  it("renders SkeletonText with expected number of lines", () => {
    const el = SkeletonText({ lines: 4 });
    expect(el.props.children).toHaveLength(4);
    expect(el.props.className).toContain("space-y-2");
  });
});
