"use client";

import type { MediaResponse } from "@feedio/api-client";
import { AlertCircle, CheckCircle2, CircleDashed, Clock } from "lucide-react";
import React, { useMemo, useState } from "react";
import { Badge, type BadgeVariant } from "../../../ui";
import { MediaKanbanColumn, type ReviewStatus } from "./media_kanban_column";

export { type ReviewStatus };

export interface MediaKanbanBoardProps {
  mediaList: MediaResponse[];
  onOpenReview?: (media: MediaResponse) => void;
  onEdit?: (media: MediaResponse) => void;
  onDelete?: (media: MediaResponse) => void;
  onMove?: (media: MediaResponse) => void;
  onStatusChange?: (mediaId: string, newStatus: ReviewStatus) => void;
  onUploadClick?: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  className?: string;
}

interface ColumnConfig {
  status: ReviewStatus;
  title: string;
  description: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  colorClass: string;
  bgClass: string;
  badgeVariant: BadgeVariant;
}

const KANBAN_COLUMNS: ColumnConfig[] = [
  {
    status: "pending",
    title: "Pending Review",
    description: "Awaiting team or client review",
    icon: CircleDashed,
    colorClass: "text-muted",
    bgClass: "bg-surface",
    badgeVariant: "surface",
  },
  {
    status: "in_progress",
    title: "In Progress",
    description: "Active revisions in progress",
    icon: Clock,
    colorClass: "text-ink",
    bgClass: "bg-paper",
    badgeVariant: "outline",
  },
  {
    status: "needs_changes",
    title: "Needs Changes",
    description: "Revisions requested",
    icon: AlertCircle,
    colorClass: "text-red-600",
    bgClass: "bg-red-50",
    badgeVariant: "danger",
  },
  {
    status: "approved",
    title: "Approved",
    description: "Ready for delivery & release",
    icon: CheckCircle2,
    colorClass: "text-ink",
    bgClass: "bg-lime/20",
    badgeVariant: "success",
  },
];

export function MediaKanbanBoard({
  mediaList,
  onOpenReview,
  onEdit,
  onDelete,
  onMove,
  onStatusChange,
  onUploadClick,
  isLoading = false,
  disabled = false,
  className = "",
}: MediaKanbanBoardProps) {
  const [activeDropStatus, setActiveDropStatus] = useState<ReviewStatus | null>(
    null,
  );
  const [draggedMediaId, setDraggedMediaId] = useState<string | null>(null);

  // Group media by status
  const groupedMedia = useMemo(() => {
    const groups: Record<ReviewStatus, MediaResponse[]> = {
      pending: [],
      in_progress: [],
      needs_changes: [],
      approved: [],
    };

    mediaList.forEach((media) => {
      const rawStatus = (
        media.review_status || "pending"
      ).toLowerCase() as ReviewStatus;
      const status: ReviewStatus = rawStatus in groups ? rawStatus : "pending";
      groups[status].push(media);
    });

    return groups;
  }, [mediaList]);

  // Compute overall progress metrics
  const stats = useMemo(() => {
    const total = mediaList.length;
    if (total === 0) {
      return {
        total: 0,
        approvedPct: 0,
        inProgressPct: 0,
        needsChangesPct: 0,
        pendingPct: 0,
      };
    }
    const approved = groupedMedia.approved.length;
    const inProgress = groupedMedia.in_progress.length;
    const needsChanges = groupedMedia.needs_changes.length;
    const pending = groupedMedia.pending.length;

    return {
      total,
      approvedPct: Math.round((approved / total) * 100),
      inProgressPct: Math.round((inProgress / total) * 100),
      needsChangesPct: Math.round((needsChanges / total) * 100),
      pendingPct: Math.round((pending / total) * 100),
    };
  }, [mediaList.length, groupedMedia]);

  const handleDropMedia = (mediaId: string, targetStatus: ReviewStatus) => {
    setActiveDropStatus(null);
    setDraggedMediaId(null);
    if (onStatusChange) {
      onStatusChange(mediaId, targetStatus);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Top Metrics Progress Header (Clean & Borderless) */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-ink">
              Review Progress • {stats.total}{" "}
              {stats.total === 1 ? "Asset" : "Assets"}
            </span>
          </div>

          {/* Standardized Design System Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge size="sm" variant="success" dot className="font-bold">
              {groupedMedia.approved.length} Approved ({stats.approvedPct}%)
            </Badge>
            <Badge size="sm" variant="outline" dot>
              {groupedMedia.in_progress.length} In Progress
            </Badge>
            <Badge size="sm" variant="danger" dot>
              {groupedMedia.needs_changes.length} Needs Changes
            </Badge>
            <Badge size="sm" variant="surface" dot>
              {groupedMedia.pending.length} Pending
            </Badge>
          </div>
        </div>

        {/* Multi-segment Sleek Progress Meter */}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-line/60 flex">
          {stats.approvedPct > 0 && (
            <div
              style={{ width: `${stats.approvedPct}%` }}
              className="h-full bg-lime transition-all duration-300"
              title={`Approved: ${stats.approvedPct}%`}
            />
          )}
          {stats.inProgressPct > 0 && (
            <div
              style={{ width: `${stats.inProgressPct}%` }}
              className="h-full bg-ink/75 transition-all duration-300"
              title={`In Progress: ${stats.inProgressPct}%`}
            />
          )}
          {stats.needsChangesPct > 0 && (
            <div
              style={{ width: `${stats.needsChangesPct}%` }}
              className="h-full bg-red-500 transition-all duration-300"
              title={`Needs Changes: ${stats.needsChangesPct}%`}
            />
          )}
          {stats.pendingPct > 0 && (
            <div
              style={{ width: `${stats.pendingPct}%` }}
              className="h-full bg-line transition-all duration-300"
              title={`Pending: ${stats.pendingPct}%`}
            />
          )}
        </div>
      </div>

      {/* 4-Column Responsive Grid with Clean Breathing Room */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {KANBAN_COLUMNS.map((col) => (
          <MediaKanbanColumn
            key={col.status}
            status={col.status}
            title={col.title}
            description={col.description}
            icon={col.icon}
            colorClass={col.colorClass}
            bgClass={col.bgClass}
            badgeVariant={col.badgeVariant}
            mediaList={groupedMedia[col.status]}
            isDropTarget={activeDropStatus === col.status}
            draggedMediaId={draggedMediaId}
            onDragOverColumn={(st) => setActiveDropStatus(st)}
            onDragLeaveColumn={() => setActiveDropStatus(null)}
            onDropMedia={handleDropMedia}
            onOpenReview={onOpenReview}
            onEdit={onEdit}
            onDelete={onDelete}
            onMove={onMove}
            onUploadClick={onUploadClick}
            disabled={disabled || isLoading}
          />
        ))}
      </div>
    </div>
  );
}
