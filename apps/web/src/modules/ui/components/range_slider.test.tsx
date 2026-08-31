import { describe, expect, it } from "vitest";
import { calculateSliderPercentage } from "./range_slider";

describe("RangeSlider Helpers", () => {
  it("calculates percentage accurately", () => {
    expect(calculateSliderPercentage(50, 0, 100)).toBe(50);
    expect(calculateSliderPercentage(0, 0, 100)).toBe(0);
    expect(calculateSliderPercentage(100, 0, 100)).toBe(100);
    expect(calculateSliderPercentage(25, 0, 50)).toBe(50);
  });

  it("clamps values exceeding boundary limits", () => {
    expect(calculateSliderPercentage(150, 0, 100)).toBe(100);
    expect(calculateSliderPercentage(-50, 0, 100)).toBe(0);
  });
});
