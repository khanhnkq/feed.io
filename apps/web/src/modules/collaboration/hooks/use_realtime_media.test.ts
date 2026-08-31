import { describe, expect, it } from "vitest";
import type { RealtimeEvent, RealtimeCommentCreatedPayload } from "../types";

describe("Realtime Event Payload Contracts", () => {
  it("structures comment.created event properly", () => {
    const payload: RealtimeCommentCreatedPayload = {
      comment: {
        id: "c-1",
        organization_id: "org-1",
        project_id: "proj-1",
        media_id: "med-1",
        user_id: "u-1",
        parent_comment_id: null,
        timestamp_seconds: 5.2,
        frame_number: 125,
        content: "Please darken the background",
        annotation_data: null,
        status: "open",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        author: {
          id: "u-1",
          name: "Test User",
        },
      },
    };

    const event: RealtimeEvent<RealtimeCommentCreatedPayload> = {
      id: "evt-123",
      event_type: "comment.created",
      room: "media:med-1",
      payload,
      created_at: new Date().toISOString(),
    };

    expect(event.event_type).toBe("comment.created");
    expect(event.room).toBe("media:med-1");
    expect(event.payload.comment.content).toBe("Please darken the background");
  });
});
