"use client";

import { MessageSquare, Paintbrush, Send } from "lucide-react";
import React from "react";

import { Badge, Button } from "@/modules/ui";
import { GuestAnnotationData, PublicComment } from "./guest_types";

interface GuestCommentSidebarProps {
  comments: PublicComment[];
  activeComment: PublicComment | null;
  onSelectComment: (comment: PublicComment) => void;
  guestName: string;
  onGuestNameChange: (name: string) => void;
  commentText: string;
  onCommentTextChange: (text: string) => void;
  currentAnnotation: GuestAnnotationData | null;
  onClearAnnotation: () => void;
  isSubmitting: boolean;
  onSubmitComment: (e: React.FormEvent) => void;
  currentTime: number;
  fps: number;
}

export function GuestCommentSidebar({
  comments,
  activeComment,
  onSelectComment,
  guestName,
  onGuestNameChange,
  commentText,
  onCommentTextChange,
  currentAnnotation,
  onClearAnnotation,
  isSubmitting,
  onSubmitComment,
  currentTime,
  fps,
}: GuestCommentSidebarProps) {
  const formatTimecode = (seconds: number, currentFps = 24) => {
    const pad = (n: number) => String(Math.floor(n)).padStart(2, "0");
    const hrs = pad(seconds / 3600);
    const mins = pad((seconds % 3600) / 60);
    const secs = pad(seconds % 60);
    const frames = pad((seconds % 1) * currentFps);
    return `${hrs}:${mins}:${secs}:${frames}`;
  };

  return (
    <aside className="w-80 border-l border-line bg-surface flex flex-col shrink-0 z-10">
      <div className="p-3.5 border-b border-line flex items-center justify-between bg-paper">
        <div className="flex items-center gap-2 text-xs font-bold text-ink">
          <MessageSquare size={14} className="text-ink" />
          <span>Comments ({comments.length})</span>
        </div>
      </div>

      {/* Comment List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {comments.length === 0 ? (
          <div className="text-center py-12 text-muted text-xs space-y-2">
            <MessageSquare className="mx-auto text-muted" size={24} />
            <p className="font-medium text-ink">No comments yet.</p>
            <p className="text-[11px]">Pause the video or draw on the screen to add feedback.</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              onClick={() => onSelectComment(comment)}
              className={`rounded-xl border p-3 text-xs space-y-2 cursor-pointer transition-all ${
                activeComment?.id === comment.id
                  ? "border-ink bg-lime/10 shadow-[2px_2px_0_#11130f]"
                  : "border-line bg-surface hover:border-ink hover:bg-paper"
              }`}
            >
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-ink">
                  {comment.author?.name || "Guest Reviewer"}
                </span>
                {comment.timestamp_seconds !== null && (
                  <Badge variant="outline" size="sm" className="text-[10px] py-0 font-mono">
                    {formatTimecode(comment.timestamp_seconds, fps)}
                  </Badge>
                )}
              </div>
              <p className="text-ink leading-relaxed whitespace-pre-wrap">{comment.content}</p>
              {comment.annotation_data && (
                <div className="flex items-center gap-1 text-[10px] text-ink font-semibold">
                  <Paintbrush size={11} className="text-ink" />
                  <span>Canvas Annotation Attached</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add Comment Input Form */}
      <form onSubmit={onSubmitComment} className="p-3 border-t border-line bg-paper space-y-2.5">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Your Name (Required)"
            value={guestName}
            onChange={(e) => onGuestNameChange(e.target.value)}
            required
            className="w-full rounded-xl border border-line bg-surface px-2.5 py-1.5 text-xs text-ink placeholder:text-muted focus:border-ink focus:outline-none"
          />
        </div>

        <div className="relative">
          <textarea
            rows={2}
            placeholder={`Comment at ${formatTimecode(currentTime, fps)}...`}
            value={commentText}
            onChange={(e) => onCommentTextChange(e.target.value)}
            required
            className="w-full rounded-xl border border-line bg-surface p-2.5 text-xs text-ink placeholder:text-muted focus:border-ink focus:outline-none resize-none"
          />
        </div>

        {currentAnnotation && (
          <div className="flex items-center justify-between rounded-lg bg-lime/20 border border-lime/60 px-2.5 py-1 text-[11px] text-ink font-medium">
            <span className="flex items-center gap-1">
              <Paintbrush size={11} className="text-ink" /> Drawing attached
            </span>
            <button
              type="button"
              onClick={onClearAnnotation}
              className="text-muted hover:text-ink font-bold hover:underline"
            >
              Remove
            </button>
          </div>
        )}

        <Button
          type="submit"
          variant="primary"
          size="sm"
          className="w-full justify-center gap-1.5 min-h-8 h-8 text-xs font-semibold"
          disabled={isSubmitting || !commentText.trim() || !guestName.trim()}
        >
          <Send size={12} className="text-white" />
          <span>{isSubmitting ? "Posting..." : "Post Comment"}</span>
        </Button>
      </form>
    </aside>
  );
}
