import type { CommentResponse } from "@feedio/api-client";
import { describe, expect, it } from "vitest";
import { deserializeAnnotations } from "../../lib/annotation_serializer";
import { formatSMPTETimecode } from "../../lib/timecode";

describe("Comment Thread Data Mapping", () => {
  const mockComment: CommentResponse = {
    id: "comment-123",
    organization_id: "org-1",
    project_id: "proj-1",
    media_id: "media-1",
    user_id: "usr-456",
    content: "Color grading needs correction",
    timestamp_seconds: 12.5,
    frame_number: 300,
    status: "open",
    annotation_data: {
      shapes: [
        {
          id: "s1",
          type: "rect",
          x: 10,
          y: 20,
          width: 50,
          height: 30,
          color: "#D8FF43",
          strokeWidth: 2,
        },
      ],
    },
    author: {
      id: "usr-456",
      name: "Jane Doe",
      email: "jane@feed.io",
      avatar_url: "https://feed.io/avatar.png",
    },
    replies: [
      {
        id: "reply-1",
        organization_id: "org-1",
        project_id: "proj-1",
        media_id: "media-1",
        user_id: "usr-789",
        author: {
          id: "usr-789",
          name: "John Smith",
          email: "john@feed.io",
        },
        content: "Will adjust in next cut",
        status: "open",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it("extracts annotations, author data and formatted timecodes from comment response", () => {
    const annotations = deserializeAnnotations(mockComment.annotation_data);
    expect(annotations.length).toBe(1);
    expect(annotations[0].type).toBe("rect");

    const formattedTime = formatSMPTETimecode(mockComment.timestamp_seconds || 0, 24);
    expect(formattedTime).toBe("00:00:12:12");

    expect(mockComment.author?.name).toBe("Jane Doe");
    expect(mockComment.author?.avatar_url).toBe("https://feed.io/avatar.png");
    expect(mockComment.replies?.length).toBe(1);
    expect(mockComment.replies?.[0].author?.name).toBe("John Smith");
    expect(mockComment.replies?.[0].content).toBe("Will adjust in next cut");
  });

  it("handles image comment without timestamp or frame number", () => {
    const imageComment: CommentResponse = {
      id: "img-comment-1",
      organization_id: "org-1",
      project_id: "proj-1",
      media_id: "img-1",
      user_id: "usr-456",
      content: "Please darken background shadow",
      timestamp_seconds: undefined,
      frame_number: undefined,
      status: "open",
      annotation_data: {
        shapes: [
          {
            id: "s-img-1",
            type: "brush",
            points: [10, 10, 20, 20, 30, 30],
            color: "#D8FF43",
            strokeWidth: 3,
          },
        ],
      },
      author: { id: "usr-456", name: "Art Director" },
      replies: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const annotations = deserializeAnnotations(imageComment.annotation_data);
    expect(annotations.length).toBe(1);
    expect(annotations[0].type).toBe("brush");
    expect(imageComment.timestamp_seconds).toBeUndefined();
    expect(imageComment.author?.name).toBe("Art Director");
  });
});
