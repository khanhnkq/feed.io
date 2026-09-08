import type { CommentResponse } from "@feedio/api-client";
import { describe, expect, it } from "vitest";
import { getInitials } from "../../../ui/components/avatar";

describe("Timeline Scrubber Marker Data & Avatar Mapping", () => {
  const mockComments: CommentResponse[] = [
    {
      id: "comment-1",
      organization_id: "org-1",
      project_id: "proj-1",
      media_id: "media-1",
      user_id: "user-1",
      content: "Color check on hero car",
      timestamp_seconds: 15.0,
      frame_number: 360,
      status: "open",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      author: {
        id: "user-1",
        name: "Sarah Connor",
        email: "sarah@feed.io",
        avatar_url: "https://feed.io/avatars/sarah.jpg",
      },
    },
    {
      id: "comment-2",
      organization_id: "org-1",
      project_id: "proj-1",
      media_id: "media-1",
      user_id: "user-2",
      content: "Audio sync verified",
      timestamp_seconds: 45.0,
      frame_number: 1080,
      status: "resolved",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      author: {
        id: "user-2",
        name: "John Wick",
        email: "john@feed.io",
      },
    },
  ];

  it("calculates pin percent and extracts author avatar metadata correctly", () => {
    const duration = 60;
    const comment1 = mockComments[0];
    const pinPercent1 = ((comment1.timestamp_seconds! / duration) * 100);
    expect(pinPercent1).toBe(25);
    expect(comment1.author?.avatar_url).toBe("https://feed.io/avatars/sarah.jpg");
    expect(getInitials(comment1.author?.name)).toBe("SC");

    const comment2 = mockComments[1];
    const pinPercent2 = ((comment2.timestamp_seconds! / duration) * 100);
    expect(pinPercent2).toBe(75);
    expect(comment2.author?.avatar_url).toBeUndefined();
    expect(getInitials(comment2.author?.name)).toBe("JW");
    expect(comment2.status).toBe("resolved");
  });

  it("handles fallback initials for authors with single name or email", () => {
    expect(getInitials("Reviewer")).toBe("RE");
    expect(getInitials("Alex Sterling")).toBe("AS");
    expect(getInitials(null)).toBe("U");
  });
});
