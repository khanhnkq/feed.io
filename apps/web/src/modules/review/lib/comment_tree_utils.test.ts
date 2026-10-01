import { describe, it, expect } from "vitest";
import type { CommentResponse } from "@feedio/api-client";
import {
  updateCommentInList,
  removeCommentFromList,
  upsertCommentInList,
} from "./comment_tree_utils";

const mockAuthor = {
  id: "u1",
  name: "Alice",
  email: "alice@test.com",
};

const sampleComments: CommentResponse[] = [
  {
    id: "c1",
    organization_id: "org1",
    project_id: "p1",
    media_id: "m1",
    user_id: "u1",
    content: "First comment",
    status: "open",
    created_at: "2026-10-01T00:00:00Z",
    updated_at: "2026-10-01T00:00:00Z",
    author: mockAuthor,
    replies: [
      {
        id: "r1",
        organization_id: "org1",
        project_id: "p1",
        media_id: "m1",
        user_id: "u2",
        parent_comment_id: "c1",
        content: "Reply to first",
        status: "open",
        created_at: "2026-10-01T00:01:00Z",
        updated_at: "2026-10-01T00:01:00Z",
        author: { id: "u2", name: "Bob" },
        replies: [],
      },
    ],
  },
  {
    id: "c2",
    organization_id: "org1",
    project_id: "p1",
    media_id: "m1",
    user_id: "u1",
    content: "Second comment",
    status: "open",
    created_at: "2026-10-01T00:02:00Z",
    updated_at: "2026-10-01T00:02:00Z",
    author: mockAuthor,
    replies: [],
  },
];

describe("comment_tree_utils", () => {
  it("optimistically updates top-level comment status", () => {
    const updated = updateCommentInList(sampleComments, "c1", (c) => ({
      ...c,
      status: "resolved",
    }));

    expect(updated[0].status).toBe("resolved");
    expect(updated[1].status).toBe("open");
  });

  it("optimistically updates nested reply status", () => {
    const updated = updateCommentInList(sampleComments, "r1", (c) => ({
      ...c,
      status: "resolved",
    }));

    expect(updated[0].replies?.[0].status).toBe("resolved");
  });

  it("removes top-level comment", () => {
    const updated = removeCommentFromList(sampleComments, "c1");
    expect(updated).toHaveLength(1);
    expect(updated[0].id).toBe("c2");
  });

  it("removes nested reply", () => {
    const updated = removeCommentFromList(sampleComments, "r1");
    expect(updated).toHaveLength(2);
    expect(updated[0].replies).toHaveLength(0);
  });

  it("upserts new top-level comment", () => {
    const newComment: CommentResponse = {
      id: "c3",
      organization_id: "org1",
      project_id: "p1",
      media_id: "m1",
      user_id: "u3",
      content: "Third comment",
      status: "open",
      created_at: "2026-10-01T00:03:00Z",
      updated_at: "2026-10-01T00:03:00Z",
      author: { id: "u3", name: "Charlie" },
      replies: [],
    };

    const updated = upsertCommentInList(sampleComments, newComment);
    expect(updated).toHaveLength(3);
    expect(updated[2].id).toBe("c3");
  });

  it("upserts new reply into parent", () => {
    const newReply: CommentResponse = {
      id: "r2",
      organization_id: "org1",
      project_id: "p1",
      media_id: "m1",
      user_id: "u3",
      parent_comment_id: "c1",
      content: "Another reply to first",
      status: "open",
      created_at: "2026-10-01T00:04:00Z",
      updated_at: "2026-10-01T00:04:00Z",
      author: { id: "u3", name: "Charlie" },
      replies: [],
    };

    const updated = upsertCommentInList(sampleComments, newReply);
    expect(updated[0].replies).toHaveLength(2);
    expect(updated[0].replies?.[1].id).toBe("r2");
  });

  it("updates existing comment if already in list", () => {
    const modifiedC2: CommentResponse = {
      ...sampleComments[1],
      content: "Updated second comment",
    };

    const updated = upsertCommentInList(sampleComments, modifiedC2);
    expect(updated).toHaveLength(2);
    expect(updated[1].content).toBe("Updated second comment");
  });
});
