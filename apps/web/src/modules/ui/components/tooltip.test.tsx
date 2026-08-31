import { describe, expect, it } from "vitest";
import { getTooltipPositionClass, tooltipPositionClasses } from "./tooltip";

describe("Tooltip Style Helpers", () => {
  it("generates correct position classes", () => {
    expect(getTooltipPositionClass("top")).toContain("bottom-full");
    expect(getTooltipPositionClass("top-left")).toContain("left-0");
    expect(getTooltipPositionClass("top-right")).toContain("right-0");
    expect(getTooltipPositionClass("bottom")).toContain("top-full");
    expect(getTooltipPositionClass("left")).toContain("right-full");
    expect(getTooltipPositionClass("right")).toContain("left-full");
  });

  it("exports full position map", () => {
    expect(tooltipPositionClasses.top).toBeDefined();
    expect(tooltipPositionClasses["top-right"]).toBeDefined();
    expect(tooltipPositionClasses.bottom).toBeDefined();
  });
});
