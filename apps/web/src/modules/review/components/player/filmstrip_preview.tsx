"use client";

import React, { useEffect, useRef } from "react";
import { formatSMPTETimecode } from "../../lib/timecode";

interface FilmstripPreviewProps {
  filmstripUrl: string | null | undefined;
  hoverTime: number;
  duration: number;
  fps?: number;
  visible: boolean;
  positionPercent: number; // 0..100
  videoSrc?: string | null;
}

export function FilmstripPreview({
  filmstripUrl,
  hoverTime,
  duration,
  fps = 24,
  visible,
  positionPercent,
  videoSrc,
}: FilmstripPreviewProps) {
  const previewVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!filmstripUrl && videoSrc && previewVideoRef.current && visible) {
      previewVideoRef.current.currentTime = Math.max(0, Math.min(duration, hoverTime));
    }
  }, [filmstripUrl, videoSrc, hoverTime, duration, visible]);

  if (!visible || duration <= 0) {
    return null;
  }

  // 5 columns sprite sheet layout calculation matching backend FilmstripGenerator
  const totalFrames = 25;
  const frameIndex = Math.min(
    totalFrames - 1,
    Math.max(0, Math.floor((hoverTime / duration) * totalFrames)),
  );

  const numCols = 5;
  const colIndex = frameIndex % numCols;
  const rowIndex = Math.floor(frameIndex / numCols);

  const frameWidth = 160;
  const frameHeight = 90;

  const bgPosX = -(colIndex * frameWidth);
  const bgPosY = -(rowIndex * frameHeight);

  // Clamp popup position so it doesn't overflow left/right edges
  const leftClamped = Math.max(10, Math.min(90, positionPercent));

  return (
    <div
      className="pointer-events-none absolute bottom-full mb-3 z-30 flex -translate-x-1/2 flex-col items-center animate-in fade-in zoom-in-95 duration-100"
      style={{ left: `${leftClamped}%` }}
    >
      <div className="overflow-hidden rounded-lg border border-ink bg-paper p-1 shadow-[3px_3px_0_#11130f]">
        {filmstripUrl ? (
          <div
            className="rounded overflow-hidden"
            style={{
              width: `${frameWidth}px`,
              height: `${frameHeight}px`,
              backgroundImage: `url(${filmstripUrl})`,
              backgroundPosition: `${bgPosX}px ${bgPosY}px`,
              backgroundRepeat: "no-repeat",
            }}
          />
        ) : videoSrc ? (
          <div className="rounded overflow-hidden bg-black" style={{ width: `${frameWidth}px`, height: `${frameHeight}px` }}>
            <video
              ref={previewVideoRef}
              src={videoSrc}
              muted
              playsInline
              preload="auto"
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="flex h-20 w-36 items-center justify-center rounded bg-surface text-[11px] font-mono text-muted">
            {formatSMPTETimecode(hoverTime, fps)}
          </div>
        )}

        <div className="mt-1 flex items-center justify-between px-1 text-[11px] font-mono font-bold text-ink">
          <span>{formatSMPTETimecode(hoverTime, fps)}</span>
          <span className="text-[10px] text-muted">{hoverTime.toFixed(1)}s</span>
        </div>
      </div>

      {/* Down arrow caret */}
      <div className="h-0 w-0 border-x-4 border-x-transparent border-t-4 border-t-ink" />
    </div>
  );
}
