import type { CommentResponse } from "@feedio/api-client";

/**
 * Updates a comment anywhere in the comment list (top-level or reply).
 */
export function updateCommentInList(
  list: CommentResponse[],
  commentId: string,
  updater: (comment: CommentResponse) => CommentResponse,
): CommentResponse[] {
  return list.map((c) => {
    if (c.id === commentId) {
      return updater(c);
    }
    if (c.replies && c.replies.length > 0) {
      return {
        ...c,
        replies: updateCommentInList(c.replies, commentId, updater),
      };
    }
    return c;
  });
}

/**
 * Removes a comment anywhere in the comment list (top-level or reply).
 */
export function removeCommentFromList(
  list: CommentResponse[],
  commentId: string,
): CommentResponse[] {
  return list
    .filter((c) => c.id !== commentId)
    .map((c) => {
      if (c.replies && c.replies.length > 0) {
        return {
          ...c,
          replies: removeCommentFromList(c.replies, commentId),
        };
      }
      return c;
    });
}

/**
 * Upserts a comment in the comment list.
 * If it has parent_comment_id, it nests inside the parent's replies.
 * If top-level, it updates existing or appends to list.
 */
export function upsertCommentInList(
  list: CommentResponse[],
  newComment: CommentResponse,
): CommentResponse[] {
  if (newComment.parent_comment_id) {
    return list.map((c) => {
      if (c.id === newComment.parent_comment_id) {
        const existingReplies = c.replies || [];
        const exists = existingReplies.some((r) => r.id === newComment.id);
        const updatedReplies = exists
          ? existingReplies.map((r) => (r.id === newComment.id ? newComment : r))
          : [...existingReplies, newComment];
        return { ...c, replies: updatedReplies };
      }
      if (c.replies && c.replies.length > 0) {
        return {
          ...c,
          replies: upsertCommentInList(c.replies, newComment),
        };
      }
      return c;
    });
  }

  const exists = list.some((c) => c.id === newComment.id);
  if (exists) {
    return list.map((c) => (c.id === newComment.id ? { ...c, ...newComment } : c));
  }
  return [...list, newComment];
}
