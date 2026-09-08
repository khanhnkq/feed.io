import { describe, expect, it } from "vitest";
import { formatRelativeTime, getNotificationTypeMeta } from "../lib/notification_utils";

describe("Notification Utilities", () => {
  it("formats relative time accurately", () => {
    const now = new Date().toISOString();
    expect(formatRelativeTime(now)).toBe("just now");

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(formatRelativeTime(fiveMinutesAgo)).toBe("5m ago");

    const threeHoursAgo = new Date(Date.now() - 3 * 3600 * 1000).toISOString();
    expect(formatRelativeTime(threeHoursAgo)).toBe("3h ago");

    const twoDaysAgo = new Date(Date.now() - 2 * 86400 * 1000).toISOString();
    expect(formatRelativeTime(twoDaysAgo)).toBe("2d ago");
  });

  it("resolves metadata correctly for different notification types", () => {
    const mentionMeta = getNotificationTypeMeta("mention");
    expect(mentionMeta.label).toBe("Mention");
    expect(mentionMeta.badgeTone).toBe("violet");

    const replyMeta = getNotificationTypeMeta("comment_reply");
    expect(replyMeta.label).toBe("Reply");
    expect(replyMeta.badgeTone).toBe("blue");

    const decisionMeta = getNotificationTypeMeta("review_decision");
    expect(decisionMeta.label).toBe("Decision");
    expect(decisionMeta.badgeTone).toBe("emerald");
  });
});
