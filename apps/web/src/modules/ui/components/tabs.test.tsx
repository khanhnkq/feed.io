import { describe, expect, it } from "vitest";
import { Tabs } from "./tabs";

describe("Tabs Component", () => {
  const items = [
    { id: "all", label: "All", count: 12 },
    { id: "unresolved", label: "Unresolved", count: 3 },
  ];

  it("renders with pills variant by default", () => {
    const el = Tabs({
      items,
      activeId: "all",
      onChange: () => {},
    });
    expect(el).toBeDefined();
    expect(el.props.className).toContain("inline-flex");
  });

  it("renders underlined variant when specified", () => {
    const el = Tabs({
      items,
      activeId: "all",
      variant: "underlined",
      onChange: () => {},
    });
    expect(el).toBeDefined();
    expect(el.props.className).toContain("border-b");
  });
});
