"use client";

import type { CommentResponse } from "@feedio/api-client";
import { Filter, MessageSquare, Search } from "lucide-react";
import React, { useMemo, useState } from "react";
import { Badge } from "../../../ui/components/badge";
import { Tabs } from "../../../ui/components/tabs";
import type { AnnotationShape } from "../../lib/annotation_serializer";
import { CommentComposer } from "./comment_composer";
import { CommentThread } from "./comment_thread";

interface CommentSidebarProps {
  comments: CommentResponse[];
  currentTime?: number;
  fps?: number;
  shapes: AnnotationShape[];
  onClearShapes: () => void;
  activeCommentId: string | null;
  onSelectComment: (comment: CommentResponse | null) => void;
  onSeek: (seconds: number) => void;
  onResolveToggle: (commentId: string, status: "open" | "resolved") => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
  onCreateComment: (data: {
    content: string;
    timestamp_seconds: number | null;
    frame_number: number | null;
    annotation_data: Record<string, unknown> | null;
    parent_comment_id?: string;
  }) => Promise<void>;
  onCreateReply: (parentCommentId: string, content: string) => Promise<void>;
  isImage?: boolean;
}

type FilterMode = "all" | "unresolved" | "frame";

export function CommentSidebar({
  comments,
  currentTime = 0,
  fps = 24,
  shapes,
  onClearShapes,
  activeCommentId,
  onSelectComment,
  onSeek,
  onResolveToggle,
  onDeleteComment,
  onCreateComment,
  onCreateReply,
  isImage = false,
}: CommentSidebarProps) {
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredComments = useMemo(() => {
    return comments.filter((c) => {
      // Search text match
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesContent = c.content.toLowerCase().includes(query);
        const matchesReplies = c.replies?.some((r) => r.content.toLowerCase().includes(query));
        if (!matchesContent && !matchesReplies) return false;
      }

      // Filter tabs
      if (filterMode === "unresolved") {
        return c.status === "open";
      }

      if (filterMode === "frame") {
        if (isImage) return true;
        if (c.timestamp_seconds === null || c.timestamp_seconds === undefined) return false;
        // Frame threshold +/- 0.5s
        return Math.abs(c.timestamp_seconds - currentTime) <= 0.5;
      }

      return true;
    });
  }, [comments, searchQuery, filterMode, currentTime, isImage]);

  const unresolvedCount = useMemo(() => {
    return comments.filter((c) => c.status === "open").length;
  }, [comments]);

  const tabItems = useMemo(() => {
    if (isImage) {
      return [
        { id: "all", label: `All (${comments.length})` },
        { id: "unresolved", label: `Open (${unresolvedCount})` },
      ];
    }
    return [
      { id: "all", label: `All (${comments.length})` },
      { id: "unresolved", label: `Open (${unresolvedCount})` },
      { id: "frame", label: "At Frame" },
    ];
  }, [comments.length, unresolvedCount, isImage]);

  return (
    <aside className="flex flex-col h-full w-full border-l border-line bg-paper">
      {/* Header with Search & Filter */}
      <div className="border-b border-line p-3 bg-surface/30">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-2 font-bold text-sm text-ink">
            <MessageSquare size={16} />
            <span>Comments</span>
            <Badge variant="lime" size="sm">
              {comments.length}
            </Badge>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search feedback..."
            className="w-full rounded-lg border border-line bg-paper py-1.5 pl-8 pr-3 text-xs text-ink placeholder:text-muted focus:border-ink focus:outline-none"
          />
        </div>

        {/* Filter Tabs using shared Tabs component */}
        <div className="mt-2.5">
          <Tabs
            items={tabItems}
            activeId={filterMode}
            onChange={(id) => setFilterMode(id as FilterMode)}
            size="sm"
            className={`w-full grid ${isImage ? "grid-cols-2" : "grid-cols-3"}`}
          />
        </div>
      </div>

      {/* Comment List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-paper">
        {filteredComments.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center text-center">
            <Filter size={24} className="text-muted/50 mb-2" />
            <p className="text-xs font-semibold text-ink">No comments found</p>
            <p className="text-[11px] text-muted mt-0.5">
              {searchQuery ? "Try refining your search keyword" : "Add the first note below!"}
            </p>
          </div>
        ) : (
          filteredComments.map((c) => (
            <CommentThread
              key={c.id}
              comment={c}
              fps={fps}
              isActive={c.id === activeCommentId}
              onSelect={onSelectComment}
              onSeek={onSeek}
              onResolveToggle={onResolveToggle}
              onDelete={onDeleteComment}
              onCreateReply={onCreateReply}
            />
          ))
        )}
      </div>

      {/* Composer at Bottom */}
      <div className="border-t border-line p-3 bg-paper">
        <CommentComposer
          currentTime={currentTime}
          fps={fps}
          shapes={shapes}
          onClearShapes={onClearShapes}
          onSubmit={onCreateComment}
          isImage={isImage}
        />
      </div>
    </aside>
  );
}
