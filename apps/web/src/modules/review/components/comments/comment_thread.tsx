"use client";

import type { CommentResponse } from "@feedio/api-client";
import { CheckCircle2, MessageSquare, Palette, RotateCcw, Trash2 } from "lucide-react";
import React, { useState } from "react";
import { Avatar } from "../../../ui/components/avatar";
import { Badge } from "../../../ui/components/badge";
import { Button } from "../../../ui/components/button";
import {
  Dialog,
  DialogCloseButton,
  DialogDescription,
  DialogEyebrow,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../../ui/components/dialog";
import { TimecodeBadge } from "../../../ui/components/timecode_badge";
import { deserializeAnnotations } from "../../lib/annotation_serializer";
import { formatSMPTETimecode } from "../../lib/timecode";
import { CommentComposer } from "./comment_composer";

interface CommentThreadProps {
  comment: CommentResponse;
  fps?: number;
  isActive: boolean;
  onSelect: (comment: CommentResponse | null) => void;
  onSeek: (seconds: number) => void;
  onResolveToggle: (commentId: string, status: "open" | "resolved") => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  onCreateReply: (parentCommentId: string, content: string) => Promise<void>;
}

export function CommentThread({
  comment,
  fps = 24,
  isActive,
  onSelect,
  onSeek,
  onResolveToggle,
  onDelete,
  onCreateReply,
}: CommentThreadProps) {
  const [showReplyComposer, setShowReplyComposer] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const isResolved = comment.status === "resolved";
  const annotations = deserializeAnnotations(comment.annotation_data);
  const replies = comment.replies || [];

  const authorName =
    comment.author?.name ||
    (comment.author?.email ? comment.author.email.split("@")[0] : null) ||
    "Reviewer";
  const authorAvatar = comment.author?.avatar_url;

  const handleJumpToTimecode = () => {
    if (isActive) {
      onSelect(null);
      return;
    }
    if (comment.timestamp_seconds !== null && comment.timestamp_seconds !== undefined) {
      onSeek(comment.timestamp_seconds);
    }
    onSelect(comment);
  };

  return (
    <div
      onClick={() => onSelect(isActive ? null : comment)}
      className={`group relative rounded-xl border p-3.5 transition-all duration-150 cursor-pointer ${
        isActive
          ? "border-ink bg-surface shadow-[3px_3px_0_#11130f]"
          : isResolved
          ? "border-line/60 bg-surface/20 opacity-75 hover:opacity-100 hover:border-ink hover:bg-surface/50"
          : "border-line bg-surface/40 hover:border-ink hover:bg-surface hover:shadow-[3px_3px_0_#d8ff43]"
      }`}
    >
      {/* Header: Author / Timecode / Actions */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Avatar
            src={authorAvatar}
            name={authorName}
            size="sm"
            tone={isActive ? "lime" : "dark"}
          />
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-ink" title={comment.author?.email || authorName}>
              {authorName}
            </span>
            <span className="text-[10px] text-muted">
              {new Date(comment.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>

        {/* Badges and Actions */}
        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          {comment.timestamp_seconds !== null && comment.timestamp_seconds !== undefined && (
            <button type="button" onClick={handleJumpToTimecode}>
              <TimecodeBadge
                timecode={formatSMPTETimecode(comment.timestamp_seconds, fps)}
                frameNumber={comment.frame_number || undefined}
                fps={fps}
                size="sm"
                variant={isActive ? "lime" : "default"}
              />
            </button>
          )}

          {annotations.length > 0 && (
            <Badge variant="lime" size="sm" className="hidden sm:inline-flex items-center gap-1">
              <Palette size={11} />
              <span>{annotations.length}</span>
            </Badge>
          )}

          {/* Resolve / Reopen */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onResolveToggle(comment.id, isResolved ? "open" : "resolved");
            }}
            className={`grid size-7 place-items-center rounded-lg border border-transparent transition ${
              isResolved
                ? "text-ink border-ink/30 bg-lime/40 hover:bg-lime"
                : "text-muted hover:border-line hover:bg-paper hover:text-ink"
            }`}
            title={isResolved ? "Reopen comment" : "Resolve comment"}
          >
            {isResolved ? <RotateCcw size={13} /> : <CheckCircle2 size={15} />}
          </button>

          {/* Delete */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteTargetId(comment.id);
            }}
            className="grid size-7 place-items-center rounded-lg border border-transparent text-muted transition hover:border-line hover:bg-red-500/10 hover:text-red-600"
            title="Delete comment"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Comment Body */}
      <div className="mt-2 text-sm text-ink leading-relaxed whitespace-pre-wrap">
        {comment.content}
      </div>

      {/* Replies List */}
      {replies.length > 0 && (
        <div className="mt-3 space-y-2 border-t border-line/50 pt-2 pl-3">
          {replies.map((reply) => {
            const replyName =
              reply.author?.name ||
              (reply.author?.email ? reply.author.email.split("@")[0] : null) ||
              "Collaborator";
            return (
              <div key={reply.id} className="relative rounded-lg border border-line/40 bg-paper/60 p-2 text-xs">
                <div className="flex items-center justify-between text-muted">
                  <div className="flex items-center gap-1.5">
                    <Avatar
                      src={reply.author?.avatar_url}
                      name={replyName}
                      size="xs"
                      tone="surface"
                    />
                    <span className="font-semibold text-ink">
                      {replyName}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTargetId(reply.id);
                    }}
                    className="grid size-6 place-items-center rounded border border-transparent text-muted transition hover:border-line hover:bg-red-500/10 hover:text-red-600"
                    title="Delete reply"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
                <p className="mt-0.5 text-ink/90 whitespace-pre-wrap pl-6">{reply.content}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Reply Toggle & Composer */}
      <div className="mt-2 flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowReplyComposer(!showReplyComposer);
          }}
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold text-muted transition hover:border hover:border-line hover:bg-paper hover:text-ink"
        >
          <MessageSquare size={12} />
          <span>{showReplyComposer ? "Cancel reply" : `Reply (${replies.length})`}</span>
        </button>

        {isResolved && (
          <span className="rounded-md border border-line bg-paper px-1.5 py-0.5 text-[10px] font-semibold text-muted">
            Resolved
          </span>
        )}
      </div>

      {showReplyComposer && (
        <div className="mt-2" onClick={(e) => e.stopPropagation()}>
          <CommentComposer
            currentTime={comment.timestamp_seconds || 0}
            fps={fps}
            shapes={[]}
            onClearShapes={() => {}}
            parentCommentId={comment.id}
            isReply={true}
            placeholder="Write a reply..."
            onSubmit={async (data) => {
              await onCreateReply(comment.id, data.content);
              setShowReplyComposer(false);
            }}
          />
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        isOpen={deleteTargetId !== null}
        onClose={() => setDeleteTargetId(null)}
        size="sm"
      >
        <DialogHeader>
          <DialogCloseButton onClick={() => setDeleteTargetId(null)} />
          <DialogEyebrow>Delete Confirmation</DialogEyebrow>
          <DialogTitle className="text-xl">Delete Comment?</DialogTitle>
          <DialogDescription>
            Are you sure you want to permanently delete this comment? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setDeleteTargetId(null)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            size="sm"
            onClick={async () => {
              if (deleteTargetId) {
                await onDelete(deleteTargetId);
                setDeleteTargetId(null);
              }
            }}
          >
            <Trash2 size={13} />
            <span>Delete</span>
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
