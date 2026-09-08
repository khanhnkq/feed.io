"use client";

import type { MediaResponse } from "@feedio/api-client";
import {
  AlertCircle,
  CheckCircle2,
  CircleDashed,
  Clock,
  Eye,
  FolderInput,
  MessageSquare,
  MoreVertical,
  Pencil,
  Play,
  RotateCw,
  Trash2,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { Badge } from "@/modules/ui";
import { formatBytes, formatDuration, formatResolutionBadge } from "../lib/media_formatters";

export interface MediaCardProps {
  media: MediaResponse;
  onPlay: (media: MediaResponse) => void;
  onOpenReview?: (media: MediaResponse) => void;
  onEdit: (media: MediaResponse) => void;
  onMove: (media: MediaResponse) => void;
  onDelete: (media: MediaResponse) => void;
  onRetryTranscode?: (media: MediaResponse) => void;
  showReviewStatus?: boolean;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragEnd?: (e: React.DragEvent<HTMLDivElement>) => void;
  isDragging?: boolean;
  className?: string;
}

export function MediaCard({
  media,
  onPlay,
  onOpenReview,
  onEdit,
  onMove,
  onDelete,
  onRetryTranscode,
  showReviewStatus = true,
  draggable = false,
  onDragStart,
  onDragEnd,
  isDragging = false,
  className = "",
}: MediaCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isImage = media.mime_type.startsWith("image/");
  const isSvg = media.mime_type === "image/svg+xml" || media.filename.endsWith(".svg");
  const resolutionBadge = isSvg
    ? "Vector"
    : formatResolutionBadge(media.width, media.height) || (media.width && media.height ? `${media.width}x${media.height}` : null);
  const isProcessing = media.status === "processing";
  const isFailed = media.status === "failed";
  const displayFormat = isSvg ? "SVG" : media.mime_type.split("/")[1]?.toUpperCase() || "FILE";

  const createdAt = new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(media.created_at));

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

  return (
    <div
      role="button"
      tabIndex={0}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={() => onPlay(media)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onPlay(media);
        }
      }}
      className={`group relative flex flex-col justify-between rounded-xl border border-line bg-surface p-4 text-left transition duration-200 hover:-translate-y-1 hover:border-ink hover:shadow-[5px_5px_0_#d8ff43] focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-focus cursor-pointer ${
        draggable ? "cursor-grab active:cursor-grabbing select-none" : ""
      } ${
        isDragging ? "opacity-40 scale-95 border-dashed border-ink shadow-none" : ""
      } ${className}`.trim()}
    >
      {/* Thumbnail area with image preview & play/view overlay */}
      <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-line bg-paper flex items-center justify-center">
        {media.thumbnail_url || (isImage && media.stream_url) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={media.thumbnail_url || media.stream_url || ""}
            alt={media.title}
            className={`h-full w-full transition-transform duration-200 group-hover:scale-105 ${
              isSvg ? "object-contain p-3" : "object-cover"
            }`}
          />
        ) : null}

        {/* View / Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/10 transition group-hover:bg-black/20">
          <div className="grid size-11 place-items-center rounded-lg border border-line bg-surface/90 text-ink shadow-xs backdrop-blur-xs transition group-hover:scale-105 group-hover:border-ink group-hover:bg-lime">
            {isImage ? (
              <Eye size={20} className="text-ink" />
            ) : (
              <Play size={20} className="ml-0.5 text-ink" />
            )}
          </div>
        </div>

        {/* Top Badges Bar (Left: Format, Resolution, Version) */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5 pointer-events-none z-10 flex-wrap">
          <Badge size="sm" variant={isImage ? "lime" : "surface"} className="backdrop-blur-xs shrink-0">
            {displayFormat}
          </Badge>
          {resolutionBadge && (
            <Badge size="sm" variant="surface" className="backdrop-blur-xs shrink-0">
              {resolutionBadge}
            </Badge>
          )}
          {media.version_number && media.version_number > 1 && (
            <Badge size="sm" variant="surface" className="backdrop-blur-xs font-mono font-bold shrink-0">
              V{media.version_number}
            </Badge>
          )}
        </div>

        {/* Bottom Badges Bar */}
        <div className="absolute bottom-2 inset-x-2 flex items-center justify-between gap-1.5 pointer-events-none z-10">
          {/* Bottom Left Corner Transcode Indicator */}
          <div className="min-w-0">
            {isProcessing && (
              <Badge size="sm" variant="surface" dot className="backdrop-blur-xs shrink-0">
                Transcoding
              </Badge>
            )}
            {isFailed && (
              <Badge size="sm" variant="danger" dot className="backdrop-blur-xs shrink-0">
                Transcode Failed
              </Badge>
            )}
          </div>

          {/* Duration badge (for video/audio only) */}
          {media.duration_seconds && media.duration_seconds > 0 ? (
            <div className="ml-auto flex h-5 items-center gap-1 rounded-lg border border-line bg-surface/90 px-1.5 text-[10px] font-mono font-semibold text-ink backdrop-blur-xs">
              <Clock size={11} className="text-muted" />
              <span>{formatDuration(media.duration_seconds)}</span>
            </div>
          ) : null}
        </div>
      </div>

      {/* Info and Actions */}
      <div className="mt-3 flex items-start justify-between gap-2 min-w-0">
        <div className="min-w-0 flex-1 space-y-1.5">
          <h3 className="truncate text-sm font-bold tracking-tight text-ink group-hover:text-black" title={media.title}>
            {media.title}
          </h3>

          {/* Review Status Badge with embedded Icon under Title */}
          {showReviewStatus && (
            <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
              {media.review_status === "approved" && (
                <Badge size="sm" variant="success" className="font-bold flex items-center gap-1">
                  <CheckCircle2 size={11} strokeWidth={2.2} className="text-[#6f8700]" />
                  <span>Approved</span>
                </Badge>
              )}
              {media.review_status === "needs_changes" && (
                <Badge size="sm" variant="danger" className="font-bold flex items-center gap-1">
                  <AlertCircle size={11} strokeWidth={2.2} className="text-red-600" />
                  <span>Needs Changes</span>
                </Badge>
              )}
              {media.review_status === "in_progress" && (
                <Badge size="sm" variant="outline" className="font-semibold bg-surface flex items-center gap-1">
                  <Clock size={11} strokeWidth={2.2} className="text-ink" />
                  <span>In Progress</span>
                </Badge>
              )}
              {(!media.review_status || media.review_status === "pending") && (
                <Badge size="sm" variant="surface" className="font-medium text-muted flex items-center gap-1">
                  <CircleDashed size={11} strokeWidth={2.2} className="text-muted" />
                  <span>Pending Review</span>
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Actions Dropdown */}
        <div
          ref={menuRef}
          className="relative shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            aria-label="Media options"
            onClick={() => setMenuOpen((prev) => !prev)}
            className="grid size-8 place-items-center rounded-lg text-muted transition hover:bg-[#eef0e6] hover:text-ink"
          >
            <MoreVertical size={16} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-9 z-20 w-36 rounded-lg border border-line bg-surface py-1 shadow-lg animate-in fade-in zoom-in-95 duration-100">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  (onOpenReview || onPlay)(media);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-ink transition hover:bg-lime/30"
              >
                <MessageSquare size={13} />
                Open Review
              </button>

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onEdit(media);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-ink transition hover:bg-[#f3f4ee]"
              >
                <Pencil size={13} />
                Rename
              </button>

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onMove(media);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-ink transition hover:bg-[#f3f4ee]"
              >
                <FolderInput size={13} />
                Move to folder
              </button>

              {isFailed && onRetryTranscode && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onRetryTranscode(media);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-ink transition hover:bg-[#f3f4ee]"
                >
                  <RotateCw size={13} />
                  Retry transcode
                </button>
              )}

              <div className="my-1 border-t border-line" />

              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onDelete(media);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50"
              >
                <Trash2 size={13} />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-3 flex items-center justify-between border-t border-line pt-2 text-[11px] font-mono text-muted">
        <span>{formatBytes(media.file_size_bytes)}</span>
        <span>{createdAt}</span>
      </div>
    </div>
  );
}
