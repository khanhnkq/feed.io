import {
  CheckCircle2,
  Clock,
  FileVideo,
  ImageIcon,
  Loader2,
  Pause,
  Play,
  RotateCw,
  X,
} from "lucide-react";
import React from "react";
import { formatBytes, formatDuration, formatResolutionBadge } from "../lib/media_formatters";
import { type ExtractedMediaMetadata, isImageFile } from "../lib/media_metadata";

export type UploadStatus =
  | "idle"
  | "presigning"
  | "uploading"
  | "paused"
  | "completing"
  | "success"
  | "error";

export interface UploadMediaFileCardProps {
  file: File;
  meta: ExtractedMediaMetadata | null;
  isExtracting: boolean;
  status: UploadStatus;
  progress: number;
  loadedBytes: number;
  isWorking: boolean;
  isMultipart?: boolean;
  completedParts?: number;
  totalParts?: number;
  speedBytesPerSec?: number;
  etaSeconds?: number | null;
  onReset: () => void;
  onPause?: () => void;
  onResume?: () => void;
  onRetry?: () => void;
}

export function UploadMediaFileCard({
  file,
  meta,
  isExtracting,
  status,
  progress,
  loadedBytes,
  isWorking,
  isMultipart,
  completedParts,
  totalParts,
  speedBytesPerSec,
  etaSeconds,
  onReset,
  onPause,
  onResume,
  onRetry,
}: UploadMediaFileCardProps) {
  const isImage = isImageFile(file);
  const isSvg = file.type === "image/svg+xml" || file.name.endsWith(".svg");
  const resolutionBadge = isSvg ? "Vector SVG" : formatResolutionBadge(meta?.width, meta?.height);

  return (
    <div className="rounded-xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-3 min-w-0">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {meta?.thumbnailDataUrl ? (
            <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-lg border border-line bg-paper flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={meta.thumbnailDataUrl}
                alt="Thumbnail preview"
                className={`h-full w-full ${isSvg ? "object-contain p-1" : "object-cover"}`}
              />
            </div>
          ) : (
            <div className="grid size-10 shrink-0 place-items-center rounded-lg border border-line bg-paper text-ink">
              {isExtracting ? (
                <Loader2 size={18} className="animate-spin text-muted" />
              ) : isImage ? (
                <ImageIcon size={18} />
              ) : (
                <FileVideo size={18} />
              )}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <p className="truncate text-sm font-semibold text-ink" title={file.name}>
                {file.name}
              </p>
              {isMultipart && (
                <span className="rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400 shrink-0">
                  Multipart S3
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted font-mono mt-0.5">
              <span>{formatBytes(file.size)}</span>
              {meta?.durationSeconds ? (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock size={11} />
                    {formatDuration(meta.durationSeconds)}
                  </span>
                </>
              ) : null}
              {resolutionBadge && (
                <>
                  <span>•</span>
                  <span className="rounded border border-line bg-paper px-1 py-0.2 text-[10px] font-semibold text-ink">
                    {resolutionBadge}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {status === "uploading" && isMultipart && onPause && (
            <button
              type="button"
              onClick={onPause}
              className="flex items-center gap-1 rounded-lg border border-line bg-paper px-2 py-1 text-xs font-medium text-ink hover:border-ink hover:bg-surface transition"
              title="Pause upload"
            >
              <Pause size={12} />
              <span>Pause</span>
            </button>
          )}

          {status === "paused" && onResume && (
            <button
              type="button"
              onClick={onResume}
              className="flex items-center gap-1 rounded-lg border border-line bg-paper px-2 py-1 text-xs font-medium text-ink hover:border-ink hover:bg-surface transition"
              title="Resume upload"
            >
              <Play size={12} />
              <span>Resume</span>
            </button>
          )}

          {status === "error" && onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="flex items-center gap-1 rounded-lg border border-line bg-paper px-2 py-1 text-xs font-medium text-ink hover:border-ink hover:bg-surface transition"
              title="Retry upload"
            >
              <RotateCw size={12} />
              <span>Retry</span>
            </button>
          )}

          {!isWorking && status !== "success" && (
            <button
              type="button"
              onClick={onReset}
              className="grid size-7 shrink-0 place-items-center rounded-lg border border-transparent text-muted hover:border-line hover:bg-paper hover:text-ink transition"
              aria-label="Remove selected file"
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Upload Progress Bar */}
      {status !== "idle" && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="flex items-center gap-1.5 text-ink truncate mr-2">
              {isWorking && <Loader2 className="h-3.5 w-3.5 animate-spin text-ink shrink-0" />}
              {status === "paused" && (
                <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                  <Pause size={13} className="shrink-0" />
                  Paused • Progress saved
                </span>
              )}
              {status === "success" && <CheckCircle2 className="h-3.5 w-3.5 text-ink shrink-0" />}
              {status === "presigning" && (isMultipart ? "Initiating Multipart Session..." : "Preparing upload...")}
              {status === "uploading" && (
                <>
                  {isMultipart && totalParts ? (
                    <span>
                      Uploading Chunks ({completedParts ?? 0}/{totalParts}) • {progress}%
                    </span>
                  ) : (
                    <span>Uploading ({progress}%)</span>
                  )}
                </>
              )}
              {status === "completing" && (isMultipart ? "Stitching S3 Parts..." : "Finalizing media...")}
              {status === "success" && "Upload complete!"}
              {status === "error" && "Upload failed"}
            </span>
            <span className="font-mono text-muted shrink-0 flex items-center gap-2">
              {speedBytesPerSec && speedBytesPerSec > 0 && status === "uploading" ? (
                <span>{formatBytes(speedBytesPerSec)}/s</span>
              ) : null}
              {etaSeconds !== undefined && etaSeconds !== null && status === "uploading" ? (
                <span>• ETA {etaSeconds}s</span>
              ) : null}
              <span>
                {formatBytes(loadedBytes)} / {formatBytes(file.size)}
              </span>
            </span>
          </div>

          <div className="h-2 w-full overflow-hidden rounded-full border border-line bg-paper">
            <div
              className={`h-full transition-all duration-200 ${
                status === "paused" ? "bg-amber-500" : "bg-ink"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export type UploadVideoFileCardProps = UploadMediaFileCardProps;
export const UploadVideoFileCard = UploadMediaFileCard;
