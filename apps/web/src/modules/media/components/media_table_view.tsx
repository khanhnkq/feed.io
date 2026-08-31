"use client";

import type { MediaResponse } from "@feedio/api-client";
import {
  AlertTriangle,
  FileVideo,
  Film,
  FolderInput,
  ImageIcon,
  MoreVertical,
  Pencil,
  Play,
  RotateCw,
  Trash2,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import {
  Badge,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from "@/modules/ui";
import { formatBytes, formatDuration } from "../lib/media_formatters";

interface MediaTableViewProps {
  mediaList: MediaResponse[];
  onPlay: (media: MediaResponse) => void;
  onEdit: (media: MediaResponse) => void;
  onMove: (media: MediaResponse) => void;
  onDelete: (media: MediaResponse) => void;
  onRetryTranscode?: (media: MediaResponse) => void;
}

export function MediaTableView({
  mediaList,
  onPlay,
  onEdit,
  onMove,
  onDelete,
  onRetryTranscode,
}: MediaTableViewProps) {
  return (
    <TableContainer>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[45%]">Name</TableHead>
            <TableHead className="hidden sm:table-cell">Duration</TableHead>
            <TableHead className="hidden sm:table-cell">Format</TableHead>
            <TableHead className="hidden sm:table-cell">Size</TableHead>
            <TableHead className="hidden md:table-cell">Created</TableHead>
            <TableHead className="text-right w-16">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mediaList.map((media) => (
            <MediaRow
              key={media.id}
              media={media}
              onPlay={onPlay}
              onEdit={onEdit}
              onMove={onMove}
              onDelete={onDelete}
              onRetryTranscode={onRetryTranscode}
            />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function MediaRow({
  media,
  onPlay,
  onEdit,
  onMove,
  onDelete,
  onRetryTranscode,
}: {
  media: MediaResponse;
  onPlay: (media: MediaResponse) => void;
  onEdit: (media: MediaResponse) => void;
  onMove: (media: MediaResponse) => void;
  onDelete: (media: MediaResponse) => void;
  onRetryTranscode?: (media: MediaResponse) => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isImage = media.mime_type.startsWith("image/");
  const isSvg = media.mime_type === "image/svg+xml" || media.filename.endsWith(".svg");
  const isProcessing = media.status === "processing";
  const isFailed = media.status === "failed";
  const displayFormat = isSvg ? "SVG" : media.mime_type.split("/")[1]?.toUpperCase() || "FILE";

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  return (
    <TableRow
      isClickable
      onClick={() => onPlay(media)}
    >
      <TableCell>
        <div className="flex items-center gap-3">
          {media.thumbnail_url || (isImage && media.stream_url) ? (
            <div className="relative size-8 shrink-0 overflow-hidden rounded-lg border border-line bg-paper flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={media.thumbnail_url || media.stream_url || ""}
                alt={media.title}
                className={`h-full w-full ${isSvg ? "object-contain p-0.5" : "object-cover"}`}
              />
            </div>
          ) : isProcessing ? (
            <div className="grid size-8 shrink-0 place-items-center rounded-lg border border-line bg-paper text-ink">
              <Film size={16} />
            </div>
          ) : isFailed ? (
            <div className="grid size-8 shrink-0 place-items-center rounded-lg border border-red-200 bg-red-50 text-red-700">
              <AlertTriangle size={16} />
            </div>
          ) : isImage ? (
            <div className="grid size-8 shrink-0 place-items-center rounded-lg border border-line bg-paper text-ink">
              <ImageIcon size={16} />
            </div>
          ) : (
            <div className="grid size-8 shrink-0 place-items-center rounded-lg border border-line bg-paper text-ink">
              <FileVideo size={16} />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-ink leading-tight block truncate text-sm" title={media.title}>
                {media.title}
              </span>
              {isProcessing && (
                <Badge size="sm" variant="surface" dot>
                  Transcoding
                </Badge>
              )}
              {isFailed && (
                <Badge size="sm" variant="danger" dot>
                  Failed
                </Badge>
              )}
            </div>
          </div>
        </div>
      </TableCell>

      <TableCell className="hidden sm:table-cell font-mono text-xs text-muted">
        {media.duration_seconds && media.duration_seconds > 0 ? formatDuration(media.duration_seconds) : "—"}
      </TableCell>

      <TableCell className="hidden sm:table-cell font-mono text-xs text-muted">
        <div className="flex items-center gap-1.5">
          <Badge size="sm" variant={isImage ? "lime" : "surface"}>
            {displayFormat}
          </Badge>
          {media.fps && (
            <span className="rounded bg-paper border border-line px-1 py-0.2 text-[10px] font-bold text-ink">
              {media.fps} FPS
            </span>
          )}
          {media.hls_storage_key && (
            <span className="rounded bg-lime/90 border border-lime px-1 py-0.2 text-[10px] font-bold text-ink">
              HLS
            </span>
          )}
        </div>
      </TableCell>

      <TableCell className="hidden sm:table-cell font-mono text-xs text-muted">
        {formatBytes(media.file_size_bytes)}
      </TableCell>

      <TableCell className="hidden md:table-cell font-mono text-xs text-muted">
        {new Date(media.created_at).toLocaleDateString()}
      </TableCell>

      <TableCell align="right" onClick={(e) => e.stopPropagation()}>
        <div className="relative inline-block text-left" ref={menuRef}>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="grid size-8 place-items-center rounded-lg text-muted transition hover:bg-[#eef0e6] hover:text-ink"
            aria-label="Video actions"
          >
            <MoreVertical size={16} />
          </button>

          {open && (
            <div className="absolute right-0 top-8 z-50 w-36 rounded-lg border border-line bg-surface py-1 shadow-lg animate-in fade-in zoom-in-95 duration-100">
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onPlay(media);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-ink transition hover:bg-[#f3f4ee]"
              >
                <Play size={13} />
                Play video
              </button>

              <button
                type="button"
                onClick={() => {
                  setOpen(false);
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
                  setOpen(false);
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
                    setOpen(false);
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
                  setOpen(false);
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
      </TableCell>
    </TableRow>
  );
}
