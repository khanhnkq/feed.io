"use client";

import type { MediaResponse } from "@feedio/api-client";
import { AlertCircle, CheckCircle2, CircleDashed, Clock } from "lucide-react";
import React, { useMemo, useState } from "react";
import type { BadgeVariant } from "../../../ui";
import { KanbanMetricsCards } from "./kanban_metrics_cards";
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



  const handleDropMedia = (mediaId: string, targetStatus: ReviewStatus) => {
    setActiveDropStatus(null);
    setDraggedMediaId(null);
    if (onStatusChange) {
      onStatusChange(mediaId, targetStatus);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Top Metrics Cards (matching Issues screen style) */}
      <KanbanMetricsCards
        total={mediaList.length}
        pendingCount={groupedMedia.pending.length}
        inProgressCount={groupedMedia.in_progress.length}
        needsChangesCount={groupedMedia.needs_changes.length}
        approvedCount={groupedMedia.approved.length}
      />

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
