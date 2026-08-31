"use client";

import type { CommentResponse } from "@feedio/api-client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FilmstripPreview } from "./filmstrip_preview";

interface TimelineScrubberProps {
  currentTime: number;
  duration: number;
  fps?: number;
  onSeek: (seconds: number) => void;
  waveformData?: string | null;
  comments?: CommentResponse[];
  onSelectComment?: (comment: CommentResponse | null) => void;
  activeCommentId?: string | null;
  inPoint?: number | null;
  outPoint?: number | null;
  filmstripUrl?: string | null;
  videoSrc?: string | null;
}

export function TimelineScrubber({
  currentTime,
  duration,
  fps = 24,
  onSeek,
  waveformData,
  comments = [],
  onSelectComment,
  activeCommentId,
  inPoint,
  outPoint,
  filmstripUrl,
  videoSrc,
}: TimelineScrubberProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [hoverTime, setHoverTime] = useState(0);
  const [hoverPercent, setHoverPercent] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const peaks: number[] = useMemo(() => {
    let raw: number[] = [];
    if (waveformData) {
      try {
        const parsed = typeof waveformData === "string" ? JSON.parse(waveformData) : waveformData;
        if (Array.isArray(parsed) && parsed.length > 0) {
          raw = parsed.map((n) => Math.abs(Number(n))).filter((n) => !Number.isNaN(n));
        }
      } catch {
        // fallback
      }
    }

    if (raw.length === 0) {
      // Deterministic dynamic organic waveform pattern
      const count = 90;
      for (let i = 0; i < count; i++) {
        const v =
          Math.abs(Math.sin(i * 0.22) * 0.5) +
          Math.abs(Math.sin(i * 0.09) * 0.35) +
          Math.abs(Math.cos(i * 0.41) * 0.25);
        raw.push(v);
      }
    }

    const maxVal = Math.max(...raw, 0.01);
    return raw.map((v) => {
      const ratio = v / maxVal;
      // Scale between 12% min and 92% max for distinct audio wave dynamics
      return Math.round(12 + ratio * 80);
    });
  }, [waveformData]);

  const getTimeFromClientX = useCallback(
    (clientX: number) => {
      if (!trackRef.current || duration <= 0) return 0;
      const rect = trackRef.current.getBoundingClientRect();
      const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return percent * duration;
    },
    [duration],
  );

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    const time = getTimeFromClientX(e.clientX);
    onSeek(time);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      const time = getTimeFromClientX(e.clientX);
      onSeek(time);
    };

    const handleWindowMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowMouseUp);
    };
  }, [isDragging, getTimeFromClientX, onSeek]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!trackRef.current || duration <= 0) return;
    const rect = trackRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const time = (percent / 100) * duration;
    setHoverPercent(Math.round(percent * 100) / 100);
    setHoverTime(time);
    setIsHovering(true);
  };

  const currentPercent = duration > 0 ? Math.round((currentTime / duration) * 10000) / 100 : 0;
  const inPercent =
    inPoint !== null && inPoint !== undefined && duration > 0
      ? Math.round((inPoint / duration) * 10000) / 100
      : null;
  const outPercent =
    outPoint !== null && outPoint !== undefined && duration > 0
      ? Math.round((outPoint / duration) * 10000) / 100
      : null;

  return (
    <div className="relative w-full select-none py-1.5">
      {/* Filmstrip Hover Preview */}
      <FilmstripPreview
        filmstripUrl={filmstripUrl}
        hoverTime={hoverTime}
        duration={duration}
        fps={fps}
        visible={isHovering}
        positionPercent={hoverPercent}
        videoSrc={videoSrc}
      />

      {/* Main Timeline Bar */}
      <div
        ref={trackRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        className="group relative h-10 w-full cursor-pointer overflow-hidden rounded-xl border border-line bg-surface/40 hover:border-ink hover:bg-surface"
      >
        {/* Waveform Visualization Bars */}
        <div className="absolute inset-0 flex items-center justify-between gap-[2px] px-2 pointer-events-none">
          {peaks.map((p, idx) => {
            const barProgress = (idx / peaks.length) * 100;
            const isPlayed = barProgress <= currentPercent;
            return (
              <div
                key={`peak-${idx}`}
                className={`w-full rounded-full ${
                  isPlayed ? "bg-ink opacity-90" : "bg-ink/35 opacity-70"
                }`}
                style={{ height: `${p}%` }}
              />
            );
          })}
        </div>

        {/* In / Out Range Highlight */}
        {inPercent !== null && outPercent !== null && outPercent > inPercent && (
          <div
            className="absolute top-0 bottom-0 bg-lime/30 border-x-2 border-lime pointer-events-none z-10"
            style={{
              left: `${inPercent}%`,
              width: `${Math.round((outPercent - inPercent) * 100) / 100}%`,
            }}
          />
        )}

        {/* Played Progress Fill */}
        <div
          className="absolute inset-y-0 left-0 bg-lime/25 pointer-events-none z-10"
          style={{ width: `${currentPercent}%` }}
        />

        {/* Active Playhead Line */}
        <div
          className="absolute top-0 bottom-0 z-20 w-[2px] bg-ink pointer-events-none"
          style={{ left: `${currentPercent}%` }}
        >
          {/* Playhead Handle */}
          <div className="absolute -top-1 -left-[5px] size-3 rounded-full border-2 border-ink bg-lime shadow-md" />
        </div>

        {/* Hover Line */}
        {isHovering && (
          <div
            className="absolute top-0 bottom-0 z-10 w-[1px] bg-ink/60 pointer-events-none"
            style={{ left: `${hoverPercent}%` }}
          />
        )}

        {/* Timecoded Comment Markers (Pins) */}
        {comments.map((comment) => {
          if (comment.timestamp_seconds === null || comment.timestamp_seconds === undefined) {
            return null;
          }
          const pinPercent =
            duration > 0
              ? Math.round(((comment.timestamp_seconds / duration) * 100) * 100) / 100
              : 0;
          const isActive = comment.id === activeCommentId;
          const isResolved = comment.status === "resolved";

          return (
            <button
              key={`pin-${comment.id}`}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (isActive) {
                  onSelectComment?.(null);
                } else {
                  if (comment.timestamp_seconds !== null && comment.timestamp_seconds !== undefined) {
                    onSeek(comment.timestamp_seconds);
                  }
                  onSelectComment?.(comment);
                }
              }}
              className={`absolute top-1/2 -translate-y-1/2 z-25 size-3 rounded-full border border-ink shadow-sm transition hover:scale-150 ${
                isActive
                  ? "bg-lime ring-2 ring-ink scale-125"
                  : isResolved
                  ? "bg-muted"
                  : "bg-red-500"
              }`}
              style={{ left: `calc(${pinPercent}% - 6px)` }}
              title={`Comment at ${comment.timestamp_seconds.toFixed(1)}s: ${comment.content.slice(0, 30)}...`}
            />
          );
        })}
      </div>
    </div>
  );
}
