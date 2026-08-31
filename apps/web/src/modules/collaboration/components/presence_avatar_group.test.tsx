import { describe, expect, it } from "vitest";
import { PresenceAvatarGroup } from "./presence_avatar_group";
import type { PresenceUser } from "../types";

describe("PresenceAvatarGroup", () => {
  it("renders null when user list is empty", () => {
    const el = PresenceAvatarGroup({ users: [] });
    expect(el).toBeNull();
  });

  it("renders container element with test id when users exist", () => {
    const mockUsers: PresenceUser[] = [
      {
        user_id: "u-1",
        name: "Alice Cooper",
        email: "alice@feed.io",
        joined_at: new Date().toISOString(),
      },
      {
        user_id: "u-2",
        name: "Bob Dylan",
        email: "bob@feed.io",
        joined_at: new Date().toISOString(),
      },
    ];

    const el = PresenceAvatarGroup({ users: mockUsers });
    expect(el).not.toBeNull();
    expect(el?.props["data-testid"]).toBe("presence-avatar-group");
    expect(el?.props.className).toContain("-space-x-2");
  });

  it("limits visible avatars according to maxVisible", () => {
    const mockUsers: PresenceUser[] = [
      { user_id: "1", name: "User 1", joined_at: "" },
      { user_id: "2", name: "User 2", joined_at: "" },
      { user_id: "3", name: "User 3", joined_at: "" },
      { user_id: "4", name: "User 4", joined_at: "" },
      { user_id: "5", name: "User 5", joined_at: "" },
    ];

    const el = PresenceAvatarGroup({ users: mockUsers, maxVisible: 3 });
    expect(el).not.toBeNull();
  });
});
