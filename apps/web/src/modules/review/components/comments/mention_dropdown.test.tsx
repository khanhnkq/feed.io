import { describe, expect, it } from "vitest";
import { MentionDropdown, type MentionUser } from "./mention_dropdown";

describe("MentionDropdown", () => {
  it("renders null when users list is empty", () => {
    const el = MentionDropdown({
      users: [],
      selectedIndex: 0,
      onSelect: () => {},
    });
    expect(el).toBeNull();
  });

  it("renders user options when users are provided", () => {
    const mockUsers: MentionUser[] = [
      { id: "u-1", name: "Elena Rostova", email: "elena@feed.io" },
      { id: "u-2", name: "Marcus Vance", email: "marcus@feed.io" },
    ];

    const el = MentionDropdown({
      users: mockUsers,
      selectedIndex: 0,
      onSelect: () => {},
    });

    expect(el).not.toBeNull();
    expect(el?.props.role).toBe("listbox");
  });
});
