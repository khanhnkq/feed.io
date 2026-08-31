"use client";

import {
  ChevronLeft,
  ChevronRight,
  FastForward,
  Maximize,
  Minimize,
  Pause,
  Play,
  Repeat,
  Rewind,
  Volume2,
  VolumeX,
} from "lucide-react";
import React from "react";
import { formatSMPTETimecode } from "../../lib/timecode";

interface PlaybackControlsProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  onStepFrame: (frames: number) => void;
  onJumpSeconds: (seconds: number) => void;
  currentTime: number;
  duration: number;
  fps?: number;
  playbackRate: number;
  onChangePlaybackRate: (rate: number) => void;
  isLooping: boolean;
  onToggleLoop: () => void;
  volume: number;
  isMuted: boolean;
  onChangeVolume: (vol: number) => void;
  onToggleMute: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export function PlaybackControls({
  isPlaying,
  onTogglePlay,
  onStepFrame,
  onJumpSeconds,
  currentTime,
  duration,
  fps = 24,
  playbackRate,
  onChangePlaybackRate,
  isLooping,
  onToggleLoop,
  volume,
  isMuted,
  onChangeVolume,
  onToggleMute,
  isFullscreen,
  onToggleFullscreen,
}: PlaybackControlsProps) {
  const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-2 py-1.5 text-ink">
      {/* Left section: Step frame, jump, play/pause */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onJumpSeconds(-5)}
          className="grid size-8 place-items-center rounded-lg border border-transparent text-ink transition hover:border-line hover:bg-surface"
          title="Rewind 5s (J / LeftArrow)"
        >
          <Rewind size={15} />
        </button>

        <button
          type="button"
          onClick={() => onStepFrame(-1)}
          className="grid size-8 place-items-center rounded-lg border border-transparent text-ink transition hover:border-line hover:bg-surface"
          title="Previous Frame (,)"
        >
          <ChevronLeft size={16} />
        </button>

        <button
          type="button"
          onClick={onTogglePlay}
          className="grid size-9 place-items-center rounded-lg border border-line bg-transparent text-ink transition hover:border-ink hover:bg-lime hover:text-ink hover:shadow-[2px_2px_0_#11130f] active:scale-95"
          title="Play / Pause (Space / K)"
        >
          {isPlaying ? <Pause size={17} /> : <Play size={17} className="ml-0.5" />}
        </button>

        <button
          type="button"
          onClick={() => onStepFrame(1)}
          className="grid size-8 place-items-center rounded-lg border border-transparent text-ink transition hover:border-line hover:bg-surface"
          title="Next Frame (.)"
        >
          <ChevronRight size={16} />
        </button>

        <button
          type="button"
          onClick={() => onJumpSeconds(5)}
          className="grid size-8 place-items-center rounded-lg border border-transparent text-ink transition hover:border-line hover:bg-surface"
          title="Forward 5s (L / RightArrow)"
        >
          <FastForward size={15} />
        </button>
      </div>

      {/* Center section: SMPTE Timecode Display */}
      <div className="flex items-center gap-2 rounded-lg border border-line bg-surface/50 px-3 py-1 font-mono text-xs font-semibold">
        <span className="text-ink">{formatSMPTETimecode(currentTime, fps)}</span>
        <span className="text-muted">/</span>
        <span className="text-muted">{formatSMPTETimecode(duration, fps)}</span>
        <span className="ml-1 rounded bg-paper px-1 py-0.5 text-[10px] text-muted border border-line/60">
          {fps} fps
        </span>
      </div>

      {/* Right section: Speed, Loop, Volume, Fullscreen */}
      <div className="flex items-center gap-2">
        {/* Loop range toggle */}
        <button
          type="button"
          onClick={onToggleLoop}
          className={`grid size-8 place-items-center rounded-lg border transition ${
            isLooping
              ? "border-ink bg-lime text-ink font-bold shadow-[2px_2px_0_#11130f]"
              : "border-transparent text-muted hover:border-line hover:bg-surface hover:text-ink"
          }`}
          title="Loop Playback"
        >
          <Repeat size={14} />
        </button>

        {/* Speed Selector */}
        <select
          value={playbackRate}
          onChange={(e) => onChangePlaybackRate(parseFloat(e.target.value))}
          className="h-8 rounded-lg border border-line bg-surface/50 px-2 text-xs font-medium text-ink transition hover:border-ink hover:bg-surface focus:outline-none"
        >
          {speeds.map((s) => (
            <option key={s} value={s}>
              {s}x
            </option>
          ))}
        </select>

        {/* Volume controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onToggleMute}
            className="grid size-8 place-items-center rounded-lg border border-transparent text-ink transition hover:border-line hover:bg-surface"
            title="Mute / Unmute (M)"
          >
            {isMuted || volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={(e) => onChangeVolume(parseFloat(e.target.value))}
            className="w-16 accent-ink cursor-pointer"
            title="Volume"
          />
        </div>

        {/* Fullscreen toggle */}
        <button
          type="button"
          onClick={onToggleFullscreen}
          className="grid size-8 place-items-center rounded-lg border border-transparent text-ink transition hover:border-line hover:bg-surface"
          title="Fullscreen (F)"
        >
          {isFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
        </button>
      </div>
    </div>
  );
}
