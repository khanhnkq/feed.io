"use client";

import type { CommentResponse } from "@feedio/api-client";
import React, { useMemo } from "react";

import type { AnnotationShape } from "../../lib/annotation_serializer";
import { CommentSidebar } from "../comments/comment_sidebar";
import { PublicComment } from "./guest_types";

export interface GuestCommentSidebarProps {
  comments?: CommentResponse[] | PublicComment[];
  activeCommentId?: string | null;
  activeComment?: CommentResponse | PublicComment | null;
  onSelectComment?: (comment: CommentResponse | null) => void;
  guestName?: string;
  onGuestNameChange?: (name: string) => void;
  currentTime?: number;
  fps?: number;
  onSeek?: (seconds: number) => void;
  onCreateComment?: (data: {
    content: string;
    timestamp_seconds: number | null;
    frame_number: number | null;
    annotation_data: Record<string, unknown> | null;
    parent_comment_id?: string;
    guest_name?: string;
  }) => Promise<void> | void;
  onCreateReply?: (
    parentCommentId: string,
    content: string,
    guest_name?: string,
  ) => Promise<void>;
  onResolveToggle?: (commentId: string, status: "open" | "resolved") => Promise<void>;
  shapes?: AnnotationShape[];
  onClearShapes?: () => void;
}

export function GuestCommentSidebar({
  comments = [],
  activeCommentId,
  activeComment,
  onSelectComment = () => {},
  guestName = "",
  onGuestNameChange = () => {},
  currentTime = 0,
  fps = 24,
  onSeek = () => {},
  onCreateComment = async () => {},
  onCreateReply,
  onResolveToggle,
  shapes = [],
  onClearShapes = () => {},
}: GuestCommentSidebarProps) {
  const normalizedComments: CommentResponse[] = useMemo(() => {
    return comments.map((c) => {
      if ("user_id" in c && "status" in c) {
        return c as CommentResponse;
      }
      const pub = c as PublicComment;
      return {
        id: pub.id,
        organization_id: "org-public",
        project_id: "proj-public",
        media_id: "med-public",
        user_id: pub.author?.id || "guest-author",
        content: pub.content,
        timestamp_seconds: pub.timestamp_seconds,
        frame_number: pub.frame_number,
        annotation_data: pub.annotation_data as unknown as Record<string, unknown>,
        status: "active",
        created_at: pub.created_at,
        updated_at: pub.created_at,
        author: {
          id: pub.author?.id || "guest-author",
          name: pub.author?.name || "Guest Reviewer",
          email: pub.author?.email || "guest@review.com",
        },
        replies: (pub.replies || []).map((r) => ({
          id: r.id,
          organization_id: "org-public",
          project_id: "proj-public",
          media_id: "med-public",
          user_id: r.author?.id || "guest-reply",
          content: r.content,
          timestamp_seconds: r.timestamp_seconds,
          frame_number: r.frame_number,
          status: "active",
          created_at: r.created_at,
          updated_at: r.created_at,
          author: {
            id: r.author?.id || "guest-reply",
            name: r.author?.name || "Team Member",
            email: r.author?.email || "team@feed.io",
          },
        })),
      };
    });
  }, [comments]);

  const selectedId = activeCommentId || (activeComment ? activeComment.id : null);

  return (
    <CommentSidebar
      comments={normalizedComments}
      currentTime={currentTime}
      fps={fps}
      shapes={shapes}
      onClearShapes={onClearShapes}
      activeCommentId={selectedId}
      onSelectComment={onSelectComment}
      onSeek={onSeek}
      onCreateComment={async (data) => {
        await onCreateComment(data);
      }}
      onCreateReply={onCreateReply}
      onResolveToggle={onResolveToggle}
      isGuest={true}
      guestName={guestName}
      onGuestNameChange={onGuestNameChange}
    />
  );
}
