"use client";

import type { MediaResponse } from "@feedio/api-client";
import {
  Columns2,
  Maximize2,
  Minimize2,
  RotateCcw,
  RotateCw,
  Sliders,
  Volume2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import React from "react";
import { Badge, Button, RangeSlider, Tooltip } from "../../../ui";
import type { CompareMode } from "../../hooks/use_synchronized_playback";
import { formatFormatBadge } from "../image/image_controls";
import { PlaybackControls } from "../player/playback_controls";
import { TimelineScrubber } from "../player/timeline_scrubber";

const COMPARE_MODES = [
  { id: "side_by_side" as const, label: "Side-by-Side", icon: Columns2 },
  { id: "wipe" as const, label: "Curtain Wipe", icon: Sliders },
];

export interface CompareFooterProps {
  isImage: boolean;
  mode: CompareMode;
  onModeChange: (mode: CompareMode) => void;
  wipePosition?: number;
  onWipePositionChange?: (pos: number) => void;
  mediaA: MediaResponse;
  mediaB: MediaResponse;
  // Video-specific props
  isPlaying?: boolean;
  currentTime?: number;
  totalDuration?: number;
  fps?: number;
  playbackRate?: number;
  audioRouting?: "A" | "B" | "none";
  volume?: number;
  isMuted?: boolean;
  isLooping?: boolean;
  isFullscreen?: boolean;
  onTogglePlay?: () => void;
  onStepFrame?: (frames: number) => void;
  onSeek?: (seconds: number) => void;
  onPlaybackRateChange?: (rate: number) => void;
  onAudioRoutingChange?: (route: "A" | "B" | "none") => void;
  onChangeVolume?: (volume: number) => void;
  onToggleMute?: () => void;
  onToggleLoop?: () => void;
  onToggleFullscreen?: () => void;
  // Image-specific props
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
  onResetZoom?: () => void;
  rotation?: number;
  onRotate?: (delta: number) => void;
  onResetView?: () => void;
}

export function CompareFooter({
  isImage,
  mode,
  onModeChange,
  mediaA,
  mediaB,
  isPlaying = false,
  currentTime = 0,
  totalDuration = 0,
  fps = 24,
  playbackRate = 1,
  audioRouting = "A",
  volume = 1,
  isMuted = false,
  isLooping = false,
  isFullscreen = false,
  onTogglePlay,
  onStepFrame,
  onSeek,
  onPlaybackRateChange,
  onAudioRoutingChange,
  onChangeVolume,
  onToggleMute,
  onToggleLoop,
  onToggleFullscreen,
  zoom = 1,
  onZoomChange,
  onResetZoom,
  rotation = 0,
  onRotate,
  onResetView,
}: CompareFooterProps) {
  const renderModeSelector = () => (
    <div className="inline-flex h-8 items-center rounded-lg border border-line bg-surface p-0.5">
      {COMPARE_MODES.map((item) => {
        const isActive = mode === item.id;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onModeChange(item.id)}
            className={`flex h-full items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition cursor-pointer ${
              isActive
                ? "border border-line/50 bg-paper text-ink font-bold shadow-2xs"
                : "text-muted hover:text-ink hover:bg-paper/40"
            }`}
          >
            <Icon size={13} className={isActive ? "text-ink" : "text-muted"} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );

  if (isImage) {
    const zoomPercentage = Math.round(zoom * 100);
    const handleZoomStep = (delta: number) => {
      const next = Math.max(0.25, Math.min(4, Number((zoom + delta).toFixed(2))));
      onZoomChange?.(next);
    };

    return (
      <footer className="h-14 border-t border-line bg-paper px-4 flex flex-wrap items-center justify-between gap-3 shrink-0 z-20 select-none">
        {/* Left: Technical Format & Dimensions */}
        <div className="flex h-8 items-center gap-2 text-xs font-mono text-muted">
          <Badge variant="surface" size="sm" className="font-bold">
            {formatFormatBadge(mediaA.mime_type)}
          </Badge>
          {mediaA.width && mediaA.height ? (
            <span className="text-[11px]">
              {mediaA.width} × {mediaA.height} px
            </span>
          ) : null}
          {rotation !== 0 && (
            <>
              <span className="text-muted/50">•</span>
              <span className="text-[11px] font-bold text-ink">{rotation}°</span>
            </>
          )}
        </div>

        {/* Right: Compare Mode Segmented Controls, Zoom, Rotate, Reset View, Fullscreen */}
        <div className="flex items-center gap-3">
          {/* Mode Selector on Right */}
          {renderModeSelector()}

          {/* Zoom Controls */}
          <div className="flex h-8 items-center gap-1.5 rounded-lg border border-line bg-surface/60 px-2">
            <Tooltip content="Zoom Out (-)">
              <button
                type="button"
                onClick={() => handleZoomStep(-0.25)}
                disabled={zoom <= 0.25}
                className="grid size-6 place-items-center rounded text-muted hover:text-ink disabled:opacity-40 cursor-pointer"
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
                onChange={(z) => onZoomChange?.(z)}
              />
            </div>

            <Tooltip content="Zoom In (+)">
              <button
                type="button"
                onClick={() => handleZoomStep(0.25)}
                disabled={zoom >= 4}
                className="grid size-6 place-items-center rounded text-muted hover:text-ink disabled:opacity-40 cursor-pointer"
              >
                <ZoomIn size={13} />
              </button>
            </Tooltip>

            <button
              type="button"
              onClick={onResetZoom}
              className="rounded px-1.5 py-0.5 font-mono text-[11px] font-bold text-ink hover:bg-paper cursor-pointer"
              title="Reset Zoom to 100%"
            >
              {zoomPercentage}%
            </button>
          </div>

          {/* Rotation Controls */}
          <div className="flex h-8 items-center gap-1 rounded-lg border border-line bg-surface/60 p-0.5">
            <Tooltip content="Rotate Left 90°">
              <button
                type="button"
                onClick={() => onRotate?.(-90)}
                className="grid size-7 place-items-center rounded text-muted hover:bg-paper hover:text-ink transition cursor-pointer"
              >
                <RotateCcw size={13} />
              </button>
            </Tooltip>
            <Tooltip content="Rotate Right 90°">
              <button
                type="button"
                onClick={() => onRotate?.(90)}
                className="grid size-7 place-items-center rounded text-muted hover:bg-paper hover:text-ink transition cursor-pointer"
              >
                <RotateCw size={13} />
              </button>
            </Tooltip>
          </div>

          {/* Reset View Button */}
          {onResetView && (
            <Button
              variant="outline"
              size="sm"
              onClick={onResetView}
              className="h-8 text-xs font-medium border-line bg-surface/50 text-ink hover:border-ink hover:bg-surface"
            >
              Reset View
            </Button>
          )}

          {/* Fullscreen Toggle */}
          {onToggleFullscreen && (
            <Tooltip content={isFullscreen ? "Exit Fullscreen (F)" : "Fullscreen (F)"} position="top-right">
              <button
                type="button"
                onClick={onToggleFullscreen}
                className="grid size-8 place-items-center rounded-lg border border-line bg-surface/60 text-muted hover:border-ink hover:text-ink transition cursor-pointer"
              >
                {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
              </button>
            </Tooltip>
          )}
        </div>
      </footer>
    );
  }

  return (
    <footer className="border-t border-line bg-paper px-4 py-2.5 flex flex-col justify-center shrink-0 z-20">
      {/* 1. Timeline Scrubber from Review Workspace VideoPlayer */}
      <TimelineScrubber
        currentTime={currentTime}
        duration={totalDuration}
        fps={fps}
        onSeek={(s) => onSeek?.(s)}
        waveformData={mediaA.waveform_data}
        filmstripUrl={mediaA.filmstrip_url}
        videoSrc={mediaA.proxy_url || mediaA.stream_url || ""}
      />

      {/* 2. PlaybackControls from Review Workspace VideoPlayer */}
      <PlaybackControls
        isPlaying={isPlaying}
        onTogglePlay={onTogglePlay || (() => {})}
        onStepFrame={(frames) => onStepFrame?.(frames)}
        onJumpSeconds={(sec) => onSeek?.(currentTime + sec)}
        currentTime={currentTime}
        duration={totalDuration}
        fps={fps}
        playbackRate={playbackRate}
        onChangePlaybackRate={(rate) => onPlaybackRateChange?.(rate)}
        isLooping={isLooping}
        onToggleLoop={onToggleLoop || (() => {})}
        volume={volume}
        isMuted={isMuted}
        onChangeVolume={onChangeVolume || (() => {})}
        onToggleMute={onToggleMute || (() => {})}
        isFullscreen={isFullscreen}
        onToggleFullscreen={onToggleFullscreen || (() => {})}
        rightSlot={
          <div className="flex items-center gap-2">
            {/* Mode Selector on Right */}
            {renderModeSelector()}

            {/* Audio routing */}
            <div
              className="flex h-8 items-center gap-1 rounded-lg border border-line bg-surface p-0.5"
              title="Audio routing"
            >
              <span className="flex h-full items-center gap-1 px-1.5 text-[11px] font-mono text-muted">
                <Volume2 size={12} />
                <span className="hidden xl:inline text-[10px] font-bold uppercase tracking-wider">
                  Audio
                </span>
              </span>
              <button
                type="button"
                onClick={() => onAudioRoutingChange?.("A")}
                className={`flex h-full items-center gap-1 rounded px-2 text-xs font-mono font-bold transition cursor-pointer ${
                  audioRouting === "A"
                    ? "bg-lime text-ink border border-ink/30 shadow-2xs"
                    : "text-muted hover:text-ink hover:bg-paper/60"
                }`}
                title={`Track A (V${mediaA.version_number ?? 1})`}
              >
                <span>A</span>
                <span className="text-[10px] font-normal opacity-70">
                  V{mediaA.version_number ?? 1}
                </span>
              </button>
              <button
                type="button"
                onClick={() => onAudioRoutingChange?.("B")}
                className={`flex h-full items-center gap-1 rounded px-2 text-xs font-mono font-bold transition cursor-pointer ${
                  audioRouting === "B"
                    ? "bg-paper text-ink border border-line font-bold shadow-2xs"
                    : "text-muted hover:text-ink hover:bg-paper/60"
                }`}
                title={`Track B (V${mediaB.version_number ?? 1})`}
              >
                <span>B</span>
                <span className="text-[10px] font-normal opacity-70">
                  V{mediaB.version_number ?? 1}
                </span>
              </button>
            </div>
          </div>
        }
      />
    </footer>
  );
}
