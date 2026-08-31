"use client";

import {
  Maximize2,
  Minimize2,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import React from "react";
import { Badge } from "../../../ui/components/badge";
import { Button } from "../../../ui/components/button";
import { RangeSlider } from "../../../ui/components/range_slider";
import { Tooltip } from "../../../ui/components/tooltip";

export interface ImageControlsProps {
  zoom: number;
  onZoomChange: (zoom: number) => void;
  onResetZoom: () => void;
  rotation: number;
  onRotate: (delta: number) => void;
  onResetView: () => void;
  width?: number | null;
  height?: number | null;
  fileSizeBytes?: number | null;
  mimeType?: string;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

function formatBytes(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let val = bytes;
  let unitIndex = 0;
  while (val >= 1024 && unitIndex < units.length - 1) {
    val /= 1024;
    unitIndex++;
  }
  return `${val.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatFormatBadge(mime?: string): string {
  if (!mime) return "IMG";
  if (mime === "image/svg+xml") return "SVG";
  if (mime === "image/png") return "PNG";
  if (mime === "image/jpeg" || mime === "image/jpg") return "JPEG";
  if (mime === "image/webp") return "WEBP";
  if (mime === "image/gif") return "GIF";
  if (mime === "image/avif") return "AVIF";
  return mime.replace("image/", "").toUpperCase();
}

export function ImageControls({
  zoom,
  onZoomChange,
  onResetZoom,
  rotation,
  onRotate,
  onResetView,
  width,
  height,
  fileSizeBytes,
  mimeType,
  isFullscreen,
  onToggleFullscreen,
}: ImageControlsProps) {
  const zoomPercentage = Math.round(zoom * 100);
  const formattedSize = formatBytes(fileSizeBytes);
  const formatLabel = formatFormatBadge(mimeType);

  const handleZoomStep = (delta: number) => {
    const next = Math.max(0.25, Math.min(4, Number((zoom + delta).toFixed(2))));
    onZoomChange(next);
  };

  return (
    <div className="relative z-20 flex flex-wrap items-center justify-between gap-3 border-t border-line bg-paper px-4 py-2.5 text-xs text-ink select-none">
      {/* Left: Image Technical Metadata */}
      <div className="flex items-center gap-2">
        <Badge variant="surface" size="sm" className="font-mono font-bold">
          {formatLabel}
        </Badge>

        {width && height ? (
          <span className="font-mono text-muted text-[11px]">
            {width} × {height} px
          </span>
        ) : null}

        {formattedSize && (
          <>
            <span className="text-muted/50">•</span>
            <span className="font-mono text-muted text-[11px]">{formattedSize}</span>
          </>
        )}

        {rotation !== 0 && (
          <>
            <span className="text-muted/50">•</span>
            <span className="font-mono text-muted text-[11px]">{rotation}°</span>
          </>
        )}
      </div>

      {/* Middle & Right: Zoom & Navigation Tools */}
      <div className="flex items-center gap-3">
        {/* Zoom Controls */}
        <div className="flex items-center gap-1.5 rounded-lg border border-line bg-surface/60 px-2 py-1">
          <Tooltip content="Zoom Out (-)">
            <button
              type="button"
              onClick={() => handleZoomStep(-0.25)}
              disabled={zoom <= 0.25}
              className="grid size-6 place-items-center rounded text-muted hover:text-ink disabled:opacity-40"
            >
              <ZoomOut size={13} />
            </button>
          </Tooltip>

          <div className="w-20 px-1">
            <RangeSlider
              min={0.25}
              max={4}
              step={0.05}
              value={zoom}
              onChange={onZoomChange}
            />
          </div>

          <Tooltip content="Zoom In (+)">
            <button
              type="button"
              onClick={() => handleZoomStep(0.25)}
              disabled={zoom >= 4}
              className="grid size-6 place-items-center rounded text-muted hover:text-ink disabled:opacity-40"
            >
              <ZoomIn size={13} />
            </button>
          </Tooltip>

          <button
            type="button"
            onClick={onResetZoom}
            className="rounded px-1.5 py-0.5 font-mono text-[11px] font-bold text-ink hover:bg-paper"
            title="Reset Zoom to 100%"
          >
            {zoomPercentage}%
          </button>
        </div>

        {/* Rotation Controls */}
        <div className="flex items-center gap-1 rounded-lg border border-line bg-surface/60 p-0.5">
          <Tooltip content="Rotate Left 90°">
            <button
              type="button"
              onClick={() => onRotate(-90)}
              className="grid size-7 place-items-center rounded text-muted hover:bg-paper hover:text-ink transition"
            >
              <RotateCcw size={13} />
            </button>
          </Tooltip>
          <Tooltip content="Rotate Right 90°">
            <button
              type="button"
              onClick={() => onRotate(90)}
              className="grid size-7 place-items-center rounded text-muted hover:bg-paper hover:text-ink transition"
            >
              <RotateCw size={13} />
            </button>
          </Tooltip>
        </div>

        {/* Reset View Button */}
        <Button variant="outline" size="sm" onClick={onResetView} className="h-7 text-xs">
          Reset View
        </Button>

        {/* Fullscreen Toggle */}
        <Tooltip content={isFullscreen ? "Exit Fullscreen (F)" : "Fullscreen (F)"} position="top-right">
          <button
            type="button"
            onClick={onToggleFullscreen}
            className="grid size-7 place-items-center rounded-lg border border-line bg-surface/60 text-muted hover:border-ink hover:text-ink transition"
          >
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>
        </Tooltip>
      </div>
    </div>
  );
}
