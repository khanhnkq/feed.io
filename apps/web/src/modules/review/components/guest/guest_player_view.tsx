"use client";

import {
  ArrowLeft,
  ArrowRight,
  MousePointer,
  Paintbrush,
  Pause,
  Play,
  RotateCcw,
  Square,
  Volume2,
  VolumeX,
} from "lucide-react";
import React from "react";

import { GuestAnnotationData } from "./guest_types";

interface GuestPlayerViewProps {
  isVideo: boolean;
  streamUrl: string | null;
  thumbnailUrl: string | null;
  title: string;
  fps: number;
  allowComments: boolean;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isPlaying: boolean;
  onTogglePlay: () => void;
  currentTime: number;
  onTimeUpdate: (time: number) => void;
  duration: number;
  onDurationChange: (dur: number) => void;
  onEnded: () => void;
  onStepFrame: (frames: number) => void;
  onSeek: (time: number) => void;
  activeTool: "none" | "pen" | "rect" | "arrow";
  onSelectTool: (tool: "none" | "pen" | "rect" | "arrow") => void;
  currentAnnotation: GuestAnnotationData | null;
  onClearAnnotation: () => void;
  playbackRate: number;
  onChangePlaybackRate: (rate: number) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  handleCanvasMouseDown: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  handleCanvasMouseMove: (e: React.MouseEvent<HTMLCanvasElement>) => void;
  handleCanvasMouseUp: () => void;
}

export function GuestPlayerView({
  isVideo,
  streamUrl,
  thumbnailUrl,
  title,
  fps,
  allowComments,
  videoRef,
  canvasRef,
  isPlaying,
  onTogglePlay,
  currentTime,
  onTimeUpdate,
  duration,
  onDurationChange,
  onEnded,
  onStepFrame,
  onSeek,
  activeTool,
  onSelectTool,
  currentAnnotation,
  onClearAnnotation,
  playbackRate,
  onChangePlaybackRate,
  isMuted,
  onToggleMute,
  handleCanvasMouseDown,
  handleCanvasMouseMove,
  handleCanvasMouseUp,
}: GuestPlayerViewProps) {
  const formatTimecode = (seconds: number, currentFps = 24) => {
    const pad = (n: number) => String(Math.floor(n)).padStart(2, "0");
    const hrs = pad(seconds / 3600);
    const mins = pad((seconds % 3600) / 60);
    const secs = pad(seconds % 60);
    const frames = pad((seconds % 1) * currentFps);
    return `${hrs}:${mins}:${secs}:${frames}`;
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-between p-4 bg-paper relative overflow-hidden">
      {/* Media & Canvas Container */}
      <div className="flex-1 w-full flex items-center justify-center relative min-h-0">
        <div className="relative max-h-full max-w-full aspect-video flex items-center justify-center bg-black rounded-xl overflow-hidden shadow-2xl border border-line">
          {isVideo && streamUrl ? (
            <video
              ref={videoRef}
              src={streamUrl}
              className="w-full h-full object-contain"
              onTimeUpdate={() => {
                if (videoRef.current) onTimeUpdate(videoRef.current.currentTime);
              }}
              onLoadedMetadata={() => {
                if (videoRef.current) onDurationChange(videoRef.current.duration);
              }}
              onEnded={onEnded}
            />
          ) : (
            <img
              src={thumbnailUrl || streamUrl || ""}
              alt={title}
              className="w-full h-full object-contain"
            />
          )}

          {/* Annotation Canvas Overlay */}
          <canvas
            ref={canvasRef}
            width={1920}
            height={1080}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            className={`absolute inset-0 w-full h-full z-10 ${
              activeTool !== "none" ? "cursor-crosshair pointer-events-auto" : "pointer-events-none"
            }`}
          />
        </div>
      </div>

      {/* Player Controls Bar */}
      {isVideo && (
        <div className="w-full max-w-4xl bg-surface border border-line rounded-2xl p-3 mt-3 shadow-[4px_4px_0_#11130f] space-y-2 z-20">
          {/* Scrub Progress Bar */}
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max={duration || 100}
              step="0.01"
              value={currentTime}
              onChange={(e) => onSeek(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-line rounded-lg appearance-none cursor-pointer accent-lime"
            />
          </div>

          <div className="flex items-center justify-between text-xs text-muted">
            {/* Playback Controls */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onStepFrame(-1)}
                title="Previous Frame"
                className="p-1.5 rounded-lg hover:bg-paper text-ink transition-colors"
              >
                <ArrowLeft size={14} className="text-ink" />
              </button>
              <button
                type="button"
                onClick={onTogglePlay}
                className="p-2 rounded-xl bg-lime text-ink font-bold border border-ink/20 hover:shadow-[2px_2px_0_#11130f] active:scale-95 transition-all shadow-sm"
              >
                {isPlaying ? (
                  <Pause size={15} className="text-ink" />
                ) : (
                  <Play size={15} className="text-ink" />
                )}
              </button>
              <button
                type="button"
                onClick={() => onStepFrame(1)}
                title="Next Frame"
                className="p-1.5 rounded-lg hover:bg-paper text-ink transition-colors"
              >
                <ArrowRight size={14} className="text-ink" />
              </button>

              <div className="font-mono text-xs font-bold text-ink bg-paper px-2.5 py-1 rounded-lg border border-line">
                {formatTimecode(currentTime, fps)}
              </div>
            </div>

            {/* Annotation Tools */}
            {allowComments && (
              <div className="flex items-center gap-1 bg-paper p-1 rounded-xl border border-line">
                <button
                  type="button"
                  onClick={() => onSelectTool("none")}
                  className={`p-1.5 rounded-lg text-xs transition-colors ${
                    activeTool === "none"
                      ? "bg-surface text-ink font-bold border border-line"
                      : "text-muted hover:text-ink"
                  }`}
                  title="Select Mode"
                >
                  <MousePointer size={14} className="text-ink" />
                </button>
                <button
                  type="button"
                  onClick={() => onSelectTool("pen")}
                  className={`p-1.5 rounded-lg text-xs transition-colors ${
                    activeTool === "pen"
                      ? "bg-lime text-ink font-bold border border-ink/20 shadow-sm"
                      : "text-muted hover:text-ink"
                  }`}
                  title="Pen Tool"
                >
                  <Paintbrush size={14} className="text-ink" />
                </button>
                <button
                  type="button"
                  onClick={() => onSelectTool("rect")}
                  className={`p-1.5 rounded-lg text-xs transition-colors ${
                    activeTool === "rect"
                      ? "bg-lime text-ink font-bold border border-ink/20 shadow-sm"
                      : "text-muted hover:text-ink"
                  }`}
                  title="Rectangle Tool"
                >
                  <Square size={14} className="text-ink" />
                </button>
                {currentAnnotation && (
                  <button
                    type="button"
                    onClick={onClearAnnotation}
                    className="p-1.5 rounded-lg text-xs text-ink hover:bg-surface hover:text-muted"
                    title="Clear Drawing"
                  >
                    <RotateCcw size={14} className="text-ink" />
                  </button>
                )}
              </div>
            )}

            {/* Speed & Volume */}
            <div className="flex items-center gap-2">
              <select
                value={playbackRate}
                onChange={(e) => onChangePlaybackRate(parseFloat(e.target.value))}
                className="bg-paper border border-line rounded-lg px-2 py-1 text-xs text-ink focus:outline-none"
              >
                <option value="0.5">0.5x</option>
                <option value="1">1.0x</option>
                <option value="1.5">1.5x</option>
                <option value="2">2.0x</option>
              </select>

              <button
                type="button"
                onClick={onToggleMute}
                className="p-1.5 rounded-lg hover:bg-paper text-ink transition-colors"
              >
                {isMuted ? (
                  <VolumeX size={14} className="text-ink" />
                ) : (
                  <Volume2 size={14} className="text-ink" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
