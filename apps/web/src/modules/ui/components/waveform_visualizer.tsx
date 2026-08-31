"use client";

import React, { type HTMLAttributes, useMemo } from "react";

export interface WaveformVisualizerProps extends HTMLAttributes<HTMLDivElement> {
  peaks?: number[];
  progress?: number; // 0.0 to 1.0
  interactive?: boolean;
  onSeek?: (percentage: number) => void;
  barWidth?: number;
  barGap?: number;
  height?: number;
  className?: string;
}

export function normalizePeaks(peaks: number[] = []): number[] {
  if (peaks && peaks.length > 0) return peaks;
  // Generate harmonic fallback waveform if none provided
  return Array.from({ length: 100 }).map((_, i) => {
    const sin = Math.sin(i * 0.15);
    const cos = Math.cos(i * 0.08);
    return Math.max(0.08, Math.min(1.0, Math.abs(sin) * 0.7 + Math.abs(cos) * 0.3));
  });
}

export function WaveformVisualizer({
  peaks = [],
  progress = 0,
  interactive = false,
  onSeek,
  barWidth = 2,
  barGap = 1,
  height = 36,
  className = "",
  ...props
}: WaveformVisualizerProps) {
  const normalizedPeaks = useMemo(() => normalizePeaks(peaks), [peaks]);
  const clampedProgress = Math.min(1, Math.max(0, progress));

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!interactive || !onSeek) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(pct);
  }

  return (
    <div
      role={interactive ? "slider" : "figure"}
      aria-label="Audio waveform visualizer"
      aria-valuenow={interactive ? Math.round(clampedProgress * 100) : undefined}
      aria-valuemin={interactive ? 0 : undefined}
      aria-valuemax={interactive ? 100 : undefined}
      onClick={handleClick}
      className={`flex items-center gap-[1px] overflow-hidden rounded-lg bg-paper/60 px-2 py-1.5 ${
        interactive ? "cursor-pointer select-none hover:bg-paper" : ""
      } ${className}`.trim()}
      style={{ height: `${height}px` }}
      {...props}
    >
      {normalizedPeaks.map((peak, idx) => {
        const peakProgress = idx / normalizedPeaks.length;
        const isPlayed = peakProgress <= clampedProgress;
        const barHeightPercent = Math.max(10, Math.round(peak * 100));

        return (
          <div
            key={idx}
            className="flex-1 flex items-center justify-center h-full"
            style={{ minWidth: `${barWidth}px`, marginRight: `${barGap}px` }}
          >
            <div
              className={`w-full rounded-full transition-colors duration-100 ${
                isPlayed
                  ? "bg-lime"
                  : "bg-[#11130f]/25 hover:bg-[#11130f]/40"
              }`}
              style={{ height: `${barHeightPercent}%` }}
            />
          </div>
        );
      })}
    </div>
  );
}
