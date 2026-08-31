import { describe, expect, it } from "vitest";
import { ColorPicker, DEFAULT_FEEDIO_PALETTE } from "./color_picker";

describe("ColorPicker Component", () => {
  it("renders with default palette", () => {
    const el = ColorPicker({
      selectedColor: "#D8FF43",
      onSelectColor: () => {},
    });
    expect(el).toBeDefined();
    expect(DEFAULT_FEEDIO_PALETTE.length).toBeGreaterThan(0);
  });
});
