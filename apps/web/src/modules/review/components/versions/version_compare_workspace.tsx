"use client";

import type { MediaResponse } from "@feedio/api-client";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Columns2,
  Pause,
  Play,
  RotateCcw,
  Sliders,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { Badge, Button } from "@/modules/ui";
import { formatSMPTETimecode } from "../../lib/timecode";
import { useSynchronizedPlayback } from "../../hooks/use_synchronized_playback";
import { VersionCompareViewport } from "./version_compare_viewport";
import { ImageCompareViewport } from "./image_compare_viewport";

interface VersionCompareWorkspaceProps {
  initialMediaA: MediaResponse;
  initialMediaB: MediaResponse;
  versions: MediaResponse[];
  onCloseCompare: () => void;
  onSelectVersionA?: (media: MediaResponse) => void;
  onSelectVersionB?: (media: MediaResponse) => void;
}

export function VersionCompareWorkspace({
  initialMediaA,
  initialMediaB,
  versions,
  onCloseCompare,
  onSelectVersionA,
  onSelectVersionB,
}: VersionCompareWorkspaceProps) {
  const [mediaA, setMediaA] = useState<MediaResponse>(initialMediaA);
  const [mediaB, setMediaB] = useState<MediaResponse>(initialMediaB);
  const isImage = Boolean(
    mediaA.mime_type.startsWith("image/") ||
    /\.(svg|png|jpe?g|webp|avif|gif)$/i.test(mediaA.filename || ""),
  );

  const fps = mediaA.fps || mediaB.fps || 24;
  const durationA = mediaA.duration_seconds || 0;
  const durationB = mediaB.duration_seconds || 0;

  const {
    videoARef,
    videoBRef,
    isPlaying,
    currentTime,
    totalDuration,
    playbackRate,
    mode,
    wipePosition,
    audioRouting,
    frameOffset,
    setMode,
    setWipePosition,
    setAudioRouting,
    setFrameOffset,
    setPlaybackRate,
    togglePlay,
    seek,
    stepFrame,
  } = useSynchronizedPlayback({
    fps,
    durationA,
    durationB,
  });

  // Source URL: for images prefer stream/proxy/thumbnail; for videos prefer proxy/stream/HLS
  const getVideoSrc = (m: MediaResponse) => m.proxy_url || m.stream_url || m.hls_stream_url || "";
  const getImageSrc = (m: MediaResponse) => m.stream_url || m.proxy_url || m.thumbnail_url || "";
  const getSrc = isImage ? getImageSrc : getVideoSrc;
  const srcA = getSrc(mediaA);
  const srcB = getSrc(mediaB);

  // Global Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (!isImage && e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (!isImage && e.code === "ArrowLeft") {
        e.preventDefault();
        stepFrame(e.shiftKey ? -5 : -1);
      } else if (!isImage && e.code === "ArrowRight") {
        e.preventDefault();
        stepFrame(e.shiftKey ? 5 : 1);
      } else if (e.key === "1") {
        setMode("side_by_side");
      } else if (e.key === "2") {
        setMode("wipe");
      } else if (e.key === "3") {
        setMode("difference");
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlay, stepFrame, setMode, isImage]);

  return (
    <div className="flex flex-col h-full w-full bg-[#12140f] text-white select-none overflow-hidden font-sans">
      {/* Top Bar: Navigation, Version Selectors & Sync Stats */}
      <header className="flex h-13 items-center justify-between border-b border-[#282a22] bg-[#1a1c16] px-4 shrink-0 z-20">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onCloseCompare}
            className="border-[#383b30] bg-[#22251d] text-white hover:border-lime hover:text-lime"
            title="Return to single view"
          >
            <ArrowLeft size={14} className="mr-1" />
            <span>Single View</span>
          </Button>

          {/* Version A Dropdown */}
          <div className="flex min-h-9 h-9 items-center gap-1.5 rounded-lg border border-[#383b30] bg-[#22251d] px-2.5">
            <span className="font-mono text-[10px] font-bold uppercase text-lime">A:</span>
            <select
              value={mediaA.id}
              onChange={(e) => {
                const found = versions.find((v) => v.id === e.target.value);
                if (found) {
                  setMediaA(found);
                  onSelectVersionA?.(found);
                }
              }}
              className="bg-transparent text-xs font-bold text-white outline-none cursor-pointer"
            >
              {versions.map((v) => (
                <option key={v.id} value={v.id} className="bg-[#1c1e18] text-white">
                  V{v.version_number ?? 1} {v.version_label ? `(${v.version_label})` : ""} - {v.title}
                </option>
              ))}
            </select>
          </div>

          <span className="text-xs font-bold font-mono text-muted">VS</span>

          {/* Version B Dropdown */}
          <div className="flex min-h-9 h-9 items-center gap-1.5 rounded-lg border border-[#383b30] bg-[#22251d] px-2.5">
            <span className="font-mono text-[10px] font-bold uppercase text-[#73e6ff]">B:</span>
            <select
              value={mediaB.id}
              onChange={(e) => {
                const found = versions.find((v) => v.id === e.target.value);
                if (found) {
                  setMediaB(found);
                  onSelectVersionB?.(found);
                }
              }}
              className="bg-transparent text-xs font-bold text-white outline-none cursor-pointer"
            >
              {versions.map((v) => (
                <option key={v.id} value={v.id} className="bg-[#1c1e18] text-white">
                  V{v.version_number ?? 1} {v.version_label ? `(${v.version_label})` : ""} - {v.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Right Info: Timecode & Master Clock Badge (video only) */}
        {!isImage && (
        <div className="flex items-center gap-2.5">
          <Badge size="sm" variant="surface" className="font-mono bg-[#22251d] border-[#383b30] text-lime">
            {formatSMPTETimecode(currentTime, fps)}
          </Badge>
          <div className="flex items-center gap-1 rounded bg-[#22251d] px-2 py-1 text-[11px] font-mono text-muted border border-[#383b30]">
            <span>Offset:</span>
            <button
              type="button"
              onClick={() => setFrameOffset(frameOffset - 1)}
              className="hover:text-white px-1 text-xs"
              title="-1 frame offset"
            >
              -
            </button>
            <span className="font-bold text-white">{frameOffset}f</span>
            <button
              type="button"
              onClick={() => setFrameOffset(frameOffset + 1)}
              className="hover:text-white px-1 text-xs"
              title="+1 frame offset"
            >
              +
            </button>
            {frameOffset !== 0 && (
              <button
                type="button"
                onClick={() => setFrameOffset(0)}
                className="hover:text-lime ml-1"
                title="Reset offset"
              >
                <RotateCcw size={10} />
              </button>
            )}
          </div>
        </div>
        )}
      </header>

      {/* Mode Selector Toolbar */}
      <section className="flex h-11 items-center justify-between border-b border-[#282a22] bg-[#141611] px-4 shrink-0">
        {/* Modes: Side-by-Side, Wipe Slider, Difference */}
        <div className="flex items-center gap-1 rounded-lg border border-[#383b30] bg-[#1c1e18] p-0.5">
          <button
            type="button"
            onClick={() => setMode("side_by_side")}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
              mode === "side_by_side"
                ? "bg-lime text-ink font-bold shadow-xs"
                : "text-muted hover:text-white"
            }`}
          >
            <Columns2 size={13} />
            <span>Side-by-Side</span>
          </button>

          <button
            type="button"
            onClick={() => setMode("wipe")}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
              mode === "wipe"
                ? "bg-lime text-ink font-bold shadow-xs"
                : "text-muted hover:text-white"
            }`}
          >
            <Sliders size={13} />
            <span>Curtain Wipe</span>
          </button>

          <button
            type="button"
            onClick={() => setMode("difference")}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition ${
              mode === "difference"
                ? "bg-lime text-ink font-bold shadow-xs"
                : "text-muted hover:text-white"
            }`}
          >
            <Sparkles size={13} />
            <span>Difference Blend</span>
          </button>
        </div>

        {/* Audio Selector (video only) */}
        {!isImage && (
        <div className="flex items-center gap-2 text-xs">
          <span className="font-mono text-muted text-[11px]">Audio Source:</span>
          <div className="flex items-center rounded-lg border border-[#383b30] bg-[#1c1e18] p-0.5">
            <button
              type="button"
              onClick={() => setAudioRouting("A")}
              className={`flex items-center gap-1 rounded px-2 py-0.5 text-xs font-bold transition ${
                audioRouting === "A"
                  ? "bg-lime text-ink"
                  : "text-muted hover:text-white"
              }`}
            >
              <Volume2 size={12} />
              <span>A (V{mediaA.version_number ?? 1})</span>
            </button>
            <button
              type="button"
              onClick={() => setAudioRouting("B")}
              className={`flex items-center gap-1 rounded px-2 py-0.5 text-xs font-bold transition ${
                audioRouting === "B"
                  ? "bg-[#73e6ff] text-ink"
                  : "text-muted hover:text-white"
              }`}
            >
              <Volume2 size={12} />
              <span>B (V{mediaB.version_number ?? 1})</span>
            </button>
            <button
              type="button"
              onClick={() => setAudioRouting("none")}
              className={`flex items-center gap-1 rounded px-2 py-0.5 text-xs font-bold transition ${
                audioRouting === "none"
                  ? "bg-red-500 text-white"
                  : "text-muted hover:text-white"
              }`}
              title="Mute both"
            >
              <VolumeX size={12} />
              <span>Mute</span>
            </button>
          </div>
        </div>
        )}
      </section>

      {/* Main Comparison Viewport */}
      {isImage ? (
        <ImageCompareViewport
          mode={mode}
          mediaA={mediaA}
          mediaB={mediaB}
          srcA={srcA}
          srcB={srcB}
          wipePosition={wipePosition}
          onWipePositionChange={setWipePosition}
        />
      ) : (
        <VersionCompareViewport
          mode={mode}
          mediaA={mediaA}
          mediaB={mediaB}
          srcA={srcA}
          srcB={srcB}
          videoARef={videoARef}
          videoBRef={videoBRef}
          wipePosition={wipePosition}
          onWipePositionChange={setWipePosition}
        />
      )}

      {/* Bottom Synchronized Playback Control Deck (video only) */}
      {!isImage && (
      <footer className="h-16 border-t border-[#282a22] bg-[#1a1c16] px-4 flex flex-col justify-center gap-1.5 shrink-0 z-20">
        {/* Scrubber Progress Bar */}
        <div
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = (e.clientX - rect.left) / rect.width;
            seek(pct * totalDuration);
          }}
          className="relative h-2 w-full cursor-pointer rounded-full bg-[#2a2d23] hover:h-2.5 transition-all overflow-hidden"
        >
          <div
            style={{
              width: `${totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0}%`,
            }}
            className="h-full bg-lime"
          />
        </div>

        {/* Control Buttons Bar */}
        <div className="flex items-center justify-between pt-0.5">
          {/* Play, Step backward, Step forward */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => stepFrame(-1)}
              className="grid size-7 place-items-center rounded text-muted hover:bg-[#282a22] hover:text-white transition"
              title="Previous Frame (Left Arrow)"
            >
              <ChevronLeft size={16} />
            </button>

            <button
              type="button"
              onClick={togglePlay}
              className="grid size-8 place-items-center rounded bg-lime text-ink hover:scale-105 transition font-bold"
              title="Play/Pause (Space)"
            >
              {isPlaying ? <Pause size={16} className="fill-ink" /> : <Play size={16} className="fill-ink ml-0.5" />}
            </button>

            <button
              type="button"
              onClick={() => stepFrame(1)}
              className="grid size-7 place-items-center rounded text-muted hover:bg-[#282a22] hover:text-white transition"
              title="Next Frame (Right Arrow)"
            >
              <ChevronRight size={16} />
            </button>

            <span className="font-mono text-xs text-white ml-2">
              {formatSMPTETimecode(currentTime, fps)} / {formatSMPTETimecode(totalDuration, fps)}
            </span>
          </div>

          {/* Speed Selector */}
          <div className="flex items-center gap-1 text-xs font-mono">
            {[0.5, 1, 1.5, 2].map((rate) => (
              <button
                key={rate}
                type="button"
                onClick={() => setPlaybackRate(rate)}
                className={`rounded px-1.5 py-0.5 ${
                  playbackRate === rate ? "bg-lime text-ink font-bold" : "text-muted hover:text-white"
                }`}
              >
                {rate}x
              </button>
            ))}
          </div>
        </div>
      </footer>
      )}
    </div>
  );
}
