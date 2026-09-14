"use client";

import { MessageSquarePlus, Palette, Send, X } from "lucide-react";
import React, { useRef, useState } from "react";
import { Badge } from "../../../ui/components/badge";
import { Button } from "../../../ui/components/button";
import { TimecodeBadge } from "../../../ui/components/timecode_badge";
import type { AnnotationShape } from "../../lib/annotation_serializer";
import { formatSMPTETimecode, secondsToFrame } from "../../lib/timecode";
import { MentionDropdown, type MentionUser } from "./mention_dropdown";

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
    guest_name?: string;
  }) => Promise<void>;
  members?: MentionUser[];
  parentCommentId?: string;
  placeholder?: string;
  isReply?: boolean;
  isImage?: boolean;
  isGuest?: boolean;
  guestName?: string;
  onGuestNameChange?: (name: string) => void;
}

export function CommentComposer({
  currentTime = 0,
  fps = 24,
  shapes,
  onClearShapes,
  onSubmit,
  members = [],
  parentCommentId,
  placeholder,
  isReply = false,
  isImage = false,
  isGuest = false,
  guestName = "",
  onGuestNameChange,
}: CommentComposerProps) {
  const [content, setContent] = useState("");
  const [localGuestName, setLocalGuestName] = useState(guestName);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionSelectedIndex, setMentionSelectedIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    if (guestName) setLocalGuestName(guestName);
  }, [guestName]);

  const defaultPlaceholder = isImage
    ? "Leave visual feedback on this image (type @ to mention)..."
    : "Leave a frame-accurate comment (type @ to mention)...";
  const finalPlaceholder = placeholder || defaultPlaceholder;

  // Filter members based on query
  const filteredMembers = mentionQuery !== null
    ? members.filter((m) =>
        m.name.toLowerCase().includes(mentionQuery.toLowerCase()) ||
        (m.email && m.email.toLowerCase().includes(mentionQuery.toLowerCase()))
      ).slice(0, 5)
    : [];

  const handleSelectMention = (user: MentionUser) => {
    if (!textareaRef.current) return;
    const text = content;
    const cursorPos = textareaRef.current.selectionStart || text.length;

    // Find the @ before cursor
    const lastAtIndex = text.lastIndexOf("@", cursorPos - 1);
    if (lastAtIndex !== -1) {
      const before = text.slice(0, lastAtIndex);
      const after = text.slice(cursorPos);
      const newText = `${before}@${user.name} ${after}`;
      setContent(newText);
      setMentionQuery(null);

      // Restore focus
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          const newPos = lastAtIndex + user.name.length + 2;
          textareaRef.current.setSelectionRange(newPos, newPos);
        }
      }, 0);
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);

    const cursorPos = e.target.selectionStart || val.length;
    const textBeforeCursor = val.slice(0, cursorPos);
    const lastWordMatch = textBeforeCursor.match(/@([a-zA-Z0-9_.\-\s]*)$/);

    if (lastWordMatch && members.length > 0) {
      const query = lastWordMatch[1];
      // Only match if query doesn't span multiple newlines
      if (!query.includes("\n") && query.length < 25) {
        setMentionQuery(query);
        setMentionSelectedIndex(0);
        return;
      }
    }
    setMentionQuery(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null && filteredMembers.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionSelectedIndex((prev) => (prev + 1) % filteredMembers.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionSelectedIndex((prev) =>
          prev === 0 ? filteredMembers.length - 1 : prev - 1
        );
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        const selected = filteredMembers[mentionSelectedIndex];
        if (selected) {
          handleSelectMention(selected);
        }
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMentionQuery(null);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || isSubmitting) return;

    if (isGuest) {
      const trimmedName = localGuestName.trim();
      if (!trimmedName) return;
      if (typeof window !== "undefined") {
        localStorage.setItem("feedio_guest_name", trimmedName);
      }
      onGuestNameChange?.(trimmedName);
    }

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
        guest_name: isGuest ? localGuestName.trim() : undefined,
      });
      setContent("");
      setMentionQuery(null);
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
      className={`relative rounded-xl border border-line bg-surface p-3 text-ink shadow-sm transition focus-within:border-ink focus-within:shadow-[3px_3px_0_#d8ff43] ${
        isReply ? "mt-2 bg-paper/60" : ""
      }`}
    >
      {/* Mention Dropdown */}
      {mentionQuery !== null && filteredMembers.length > 0 && (
        <MentionDropdown
          users={filteredMembers}
          selectedIndex={mentionSelectedIndex}
          onSelect={handleSelectMention}
        />
      )}

      {/* Guest Name Input */}
      {isGuest && (
        <div className="mb-2.5">
          <input
            type="text"
            required
            value={localGuestName}
            onChange={(e) => {
              setLocalGuestName(e.target.value);
              onGuestNameChange?.(e.target.value);
            }}
            placeholder="Your Name (Required)..."
            className="w-full rounded-lg border border-line bg-paper px-2.5 py-1 text-xs text-ink placeholder:text-muted focus:border-ink focus:outline-none"
          />
        </div>
      )}

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
        ref={textareaRef}
        value={content}
        onChange={handleContentChange}
        onKeyDown={handleKeyDown}
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
          disabled={!content.trim() || isSubmitting || (isGuest && !localGuestName.trim())}
          pending={isSubmitting}
        >
          {isReply ? <Send size={12} /> : <MessageSquarePlus size={13} />}
          <span>{isReply ? "Reply" : "Comment"}</span>
        </Button>
      </div>
    </form>
  );
}

