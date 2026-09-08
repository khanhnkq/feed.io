import { describe, expect, it } from "vitest";
import type {
  RealtimeEvent,
  RealtimeOrganizationMembersUpdatedPayload,
  RealtimeSessionRevokedPayload,
} from "../types";

describe("User Realtime Event Payload Contracts", () => {
  it("structures session.revoked event properly", () => {
    const payload: RealtimeSessionRevokedPayload = {
      user_id: "usr-123",
      session_id: "sess-abc",
      reason: "remote_revocation",
    };

    const event: RealtimeEvent<RealtimeSessionRevokedPayload> = {
      id: "evt-501",
      event_type: "session.revoked",
      room: "user:usr-123",
      payload,
      created_at: new Date().toISOString(),
    };

    expect(event.event_type).toBe("session.revoked");
    expect(event.room).toBe("user:usr-123");
    expect(event.payload.session_id).toBe("sess-abc");
    expect(event.payload.reason).toBe("remote_revocation");
  });

  it("structures organization.members_updated event properly", () => {
    const payload: RealtimeOrganizationMembersUpdatedPayload = {
      organization_id: "org-1",
      user_id: "usr-123",
      role: "admin",
      action: "updated",
    };

    const event: RealtimeEvent<RealtimeOrganizationMembersUpdatedPayload> = {
      id: "evt-502",
      event_type: "organization.members_updated",
      room: "user:usr-123",
      payload,
      created_at: new Date().toISOString(),
    };

    expect(event.event_type).toBe("organization.members_updated");
    expect(event.payload.action).toBe("updated");
  });
});
