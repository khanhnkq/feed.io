import { describe, expect, it } from "vitest";
import {
  floatingPopupPositionClasses,
  floatingPopupVariantClasses,
  getFloatingPopupPositionClassName,
  getFloatingPopupVariantClassName,
} from "./floating_popup";

describe("FloatingPopup Class Utilities", () => {
  it("returns correct classes for each position", () => {
    expect(getFloatingPopupPositionClassName("bottom-right")).toBe("bottom-6 right-6");
    expect(getFloatingPopupPositionClassName("bottom-left")).toBe("bottom-6 left-6");
    expect(getFloatingPopupPositionClassName("top-right")).toBe("top-6 right-6");
    expect(getFloatingPopupPositionClassName("top-left")).toBe("top-6 left-6");
    expect(floatingPopupPositionClasses["bottom-right"]).toBe("bottom-6 right-6");
  });

  it("returns correct variant styling classes consistent with Feed.io design system", () => {
    expect(getFloatingPopupVariantClassName("surface")).toContain("bg-surface");
    expect(getFloatingPopupVariantClassName("surface")).toContain("hover:shadow-[5px_5px_0_#d8ff43]");

    expect(getFloatingPopupVariantClassName("success")).toContain("bg-surface");
    expect(getFloatingPopupVariantClassName("success")).toContain("hover:shadow-[5px_5px_0_#d8ff43]");

    expect(getFloatingPopupVariantClassName("dark")).toContain("bg-ink");
    expect(getFloatingPopupVariantClassName("dark")).toContain("text-white");

    expect(getFloatingPopupVariantClassName("error")).toContain("hover:shadow-[5px_5px_0_#dc2626]");
    expect(floatingPopupVariantClasses.surface).toBe(
      "border-line bg-surface text-ink hover:-translate-y-1 hover:border-ink hover:shadow-[5px_5px_0_#d8ff43]",
    );
  });
});
