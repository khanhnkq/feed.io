import { describe, expect, it, vi } from "vitest";

import { FilterToolbar, type SortOptionItem } from "./filter_toolbar";

const sortOptions: SortOptionItem<string>[] = [
  { value: "created_desc", label: "Newest first" },
  { value: "name_asc", label: "Name (A → Z)" },
];

describe("FilterToolbar", () => {
  it("renders FilterToolbar component tree", () => {
    const onSearchChange = vi.fn();
    const onViewModeChange = vi.fn();
    const onSortChange = vi.fn();

    const element = FilterToolbar({
      search: "test-query",
      onSearchChange,
      searchPlaceholder: "Search projects…",
      searchAriaLabel: "Search projects",
      count: 5,
      itemLabelSingular: "project",
      itemLabelPlural: "projects",
      viewMode: "grid",
      onViewModeChange,
      sortOption: "created_desc",
      onSortChange,
      sortOptions,
      sortAriaLabel: "Sort projects",
      borderTop: true,
    });

    expect(element.type).toBe("section");
    expect(element.props.className).toContain("border-t");
    expect(element.props.className).toContain("border-line");
  });

  it("handles borderTop false correctly", () => {
    const element = FilterToolbar({
      search: "",
      onSearchChange: vi.fn(),
      count: 1,
      itemLabelSingular: "folder",
      itemLabelPlural: "folders",
      borderTop: false,
      className: "custom-class",
    });

    expect(element.props.className).not.toContain("border-t");
    expect(element.props.className).toContain("custom-class");
  });
});
