import { describe, expect, it } from "vitest";
import {
  ProgressBar,
  progressBarSizeClasses,
  progressBarVariantClasses,
} from "./progress_bar";

describe("ProgressBar Component", () => {
  it("renders with percentage value", () => {
    const el = ProgressBar({ value: 75, showValue: true, label: "Uploading Video" });
    expect(el.props.className).toContain("w-full");
  });

  it("applies correct variant and size classes", () => {
    expect(progressBarVariantClasses.ink).toBe("bg-ink");
    expect(progressBarVariantClasses.lime).toBe("bg-lime");
    expect(progressBarVariantClasses.danger).toBe("bg-red-600");

    expect(progressBarSizeClasses.sm).toBe("h-1");
    expect(progressBarSizeClasses.md).toBe("h-1.5");
    expect(progressBarSizeClasses.lg).toBe("h-2.5");
  });
});
