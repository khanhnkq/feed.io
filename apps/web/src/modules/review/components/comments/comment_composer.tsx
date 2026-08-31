"use client";

import { MessageSquarePlus, Palette, Send, X } from "lucide-react";
import React, { useState } from "react";
import { Badge } from "../../../ui/components/badge";
import { Button } from "../../../ui/components/button";
import { TimecodeBadge } from "../../../ui/components/timecode_badge";
import type { AnnotationShape } from "../../lib/annotation_serializer";
import { formatSMPTETimecode, secondsToFrame } from "../../lib/timecode";

interface CommentComposerProps {
  currentTime?: number;
  fps?: number;
  shapes: AnnotationShape[];
  onClearShapes: () => void;
  onSubmit: (data: {
    content: string;
    timestamp_seconds: number | null;
    frame_number: number | null;
    annotation_data: Record<string, unknown> | null;
    parent_comment_id?: string;
  }) => Promise<void>;
  parentCommentId?: string;
  placeholder?: string;
  isReply?: boolean;
  isImage?: boolean;
}

export function CommentComposer({
  currentTime = 0,
  fps = 24,
  shapes,
  onClearShapes,
  onSubmit,
  parentCommentId,
  placeholder,
  isReply = false,
  isImage = false,
}: CommentComposerProps) {
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const defaultPlaceholder = isImage
    ? "Leave visual feedback on this image..."
    : "Leave a frame-accurate comment...";
  const finalPlaceholder = placeholder || defaultPlaceholder;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSubmitting) return;

    try {
      setIsSubmitting(true);
      await onSubmit({
        content: content.trim(),
        timestamp_seconds: isReply || isImage ? null : currentTime,
        frame_number: isReply || isImage ? null : secondsToFrame(currentTime, fps),
        annotation_data:
          !isReply && shapes.length > 0
            ? ({ version: 1, shapes } as unknown as Record<string, unknown>)
            : null,
        parent_comment_id: parentCommentId,
      });
      setContent("");
      if (!isReply) {
        onClearShapes();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`rounded-xl border border-line bg-surface p-3 text-ink shadow-sm transition focus-within:border-ink focus-within:shadow-[3px_3px_0_#d8ff43] ${
        isReply ? "mt-2 bg-paper/60" : ""
      }`}
    >
      {/* Timecode / Image Note & Annotation Attachment Pill */}
      {!isReply && (
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          {isImage ? (
            <Badge variant="surface" size="sm" className="font-mono text-[11px]">
              Image Note
            </Badge>
          ) : (
            <TimecodeBadge
              timecode={formatSMPTETimecode(currentTime, fps)}
              frameNumber={secondsToFrame(currentTime, fps)}
              fps={fps}
              size="sm"
              variant="default"
            />
          )}

          {shapes.length > 0 && (
            <Badge variant="lime" size="sm" className="inline-flex items-center gap-1.5">
              <Palette size={12} />
              <span>{shapes.length} drawing{shapes.length > 1 ? "s" : ""} attached</span>
              <button
                type="button"
                onClick={onClearShapes}
                className="ml-1 text-ink/70 hover:text-red-600 transition"
                title="Remove drawings"
              >
                <X size={12} />
              </button>
            </Badge>
          )}
        </div>
      )}

      {/* Input textarea */}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
          }
        }}
        placeholder={finalPlaceholder}
        rows={isReply ? 2 : 3}
        className="w-full resize-none bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
      />

      {/* Bottom action bar */}
      <div className="mt-2 flex items-center justify-between pt-2 border-t border-line/60">
        <span className="text-[10px] text-muted">
          Press <kbd className="rounded border border-line bg-paper px-1 py-0.5 font-mono text-[9px] text-ink">Enter ↵</kbd> to submit
        </span>

        <Button
          type="submit"
          variant="lime"
          size="sm"
          disabled={!content.trim() || isSubmitting}
          pending={isSubmitting}
        >
          {isReply ? <Send size={12} /> : <MessageSquarePlus size={13} />}
          <span>{isReply ? "Reply" : "Comment"}</span>
        </Button>
      </div>
    </form>
  );
}
