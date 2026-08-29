import { describe, expect, it } from "vitest";

import {
  canInviteMembers,
  canManageMemberRole,
  canRemoveMember,
} from "./member_permissions";

describe("member_permissions", () => {
  it("allows owners and admins to invite members", () => {
    expect(canInviteMembers("owner")).toBe(true);
    expect(canInviteMembers("admin")).toBe(true);
    expect(canInviteMembers("member")).toBe(false);
  });

  it("only allows owners to manage other members' roles", () => {
    expect(canManageMemberRole("owner", false)).toBe(true);
    expect(canManageMemberRole("owner", true)).toBe(false);
    expect(canManageMemberRole("admin", false)).toBe(false);
    expect(canManageMemberRole("member", false)).toBe(false);
  });

  it("correctly evaluates remove permissions", () => {
    // Self removal / leave
    expect(canRemoveMember("member", "member", true)).toBe(true);
    expect(canRemoveMember("admin", "admin", true)).toBe(true);

    // Owner removing anyone else
    expect(canRemoveMember("owner", "admin", false)).toBe(true);
    expect(canRemoveMember("owner", "member", false)).toBe(true);

    // Admin removing member
    expect(canRemoveMember("admin", "member", false)).toBe(true);

    // Admin removing admin or owner
    expect(canRemoveMember("admin", "admin", false)).toBe(false);
    expect(canRemoveMember("admin", "owner", false)).toBe(false);

    // Member removing anyone else
    expect(canRemoveMember("member", "member", false)).toBe(false);
  });
});
