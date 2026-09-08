"use client";

import type { MediaResponse } from "@feedio/api-client";
import { Plus } from "lucide-react";
import React from "react";
import { Badge, type BadgeVariant } from "../../../ui";
import { MediaCard } from "../media_card";

export type ReviewStatus = "pending" | "in_progress" | "needs_changes" | "approved";

export interface MediaKanbanColumnProps {
  status: ReviewStatus;
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  colorClass: string;
  bgClass: string;
  badgeVariant: BadgeVariant;
  mediaList: MediaResponse[];
  isDropTarget?: boolean;
  draggedMediaId?: string | null;
  onDragOverColumn?: (status: ReviewStatus) => void;
  onDragLeaveColumn?: (status: ReviewStatus) => void;
  onDropMedia?: (mediaId: string, status: ReviewStatus) => void;
  onOpenReview?: (media: MediaResponse) => void;
  onEdit?: (media: MediaResponse) => void;
  onDelete?: (media: MediaResponse) => void;
  onMove?: (media: MediaResponse) => void;
  onUploadClick?: () => void;
  disabled?: boolean;
}

export function MediaKanbanColumn({
  status,
  title,
  description,
  icon: Icon,
  colorClass,
  badgeVariant,
  mediaList,
  isDropTarget = false,
  draggedMediaId = null,
  onDragOverColumn,
  onDragLeaveColumn,
  onDropMedia,
  onOpenReview,
  onEdit,
  onDelete,
  onMove,
  onUploadClick,
  disabled = false,
}: MediaKanbanColumnProps) {
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (!disabled && onDragOverColumn) {
      onDragOverColumn(status);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    if (!disabled && onDragLeaveColumn) {
      onDragLeaveColumn(status);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const mediaId = e.dataTransfer.getData("text/plain") || draggedMediaId;
    if (mediaId && onDropMedia && !disabled) {
      onDropMedia(mediaId, status);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex flex-col rounded-2xl bg-[#e6e7de]/80 border border-line/70 p-3 transition-all duration-200 min-h-[520px] shadow-2xs ${
        isDropTarget
          ? "bg-lime/20 border-ink ring-2 ring-ink shadow-sm"
          : "hover:bg-[#e3e4da] hover:border-line"
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-2 py-2 mb-1">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={`flex items-center justify-center size-6 rounded-md ${colorClass}`}>
            <Icon size={16} />
          </span>
          <div className="min-w-0 flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink font-mono truncate">
              {title}
            </h3>
            <Badge size="sm" variant={badgeVariant} className="font-mono text-[10px] px-2 py-0.5">
              {mediaList.length}
            </Badge>
          </div>
        </div>

        {onUploadClick && status === "pending" && (
          <button
            type="button"
            onClick={onUploadClick}
            aria-label="Upload media"
            className="grid size-6 place-items-center rounded-md bg-surface text-muted transition hover:bg-paper hover:text-ink shadow-2xs border border-line/60"
          >
            <Plus size={13} />
          </button>
        )}
      </div>

      {/* Cards Scrollable Dropzone Area (with top padding for hover translation) */}
      <div className="flex-1 space-y-3.5 overflow-y-auto pt-2.5 pb-2 px-1">
        {mediaList.length > 0 ? (
          mediaList.map((media) => (
            <MediaCard
              key={media.id}
              media={media}
              draggable={!disabled}
              isDragging={draggedMediaId === media.id}
              onDragStart={(e) => {
                if (disabled) return;
                e.dataTransfer.setData("text/plain", media.id);
                e.dataTransfer.effectAllowed = "move";
              }}
              onPlay={onOpenReview || (() => {})}
              onOpenReview={onOpenReview}
              onEdit={onEdit || (() => {})}
              onDelete={onDelete || (() => {})}
              onMove={onMove || (() => {})}
            />
          ))
        ) : (
          <div
            className={`grid place-items-center rounded-xl p-8 text-center transition-colors min-h-[220px] border border-dashed ${
              isDropTarget
                ? "border-ink bg-lime/20 text-ink"
                : "border-line/80 bg-paper/50 text-muted"
            }`}
          >
            <Icon size={22} className="mb-2 opacity-40" />
            <p className="text-xs font-semibold text-ink/70">No assets</p>
            <p className="text-[11px] text-muted mt-0.5">
              {isDropTarget ? "Drop here to update stage" : description}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
