"use client";

import type { MediaResponse } from "@feedio/api-client";
import React, { useCallback, useRef } from "react";
import { Badge } from "@/modules/ui";
import type { CompareMode } from "../../hooks/use_synchronized_playback";

interface VersionCompareViewportProps {
  mode: CompareMode;
  mediaA: MediaResponse;
  mediaB: MediaResponse;
  srcA: string;
  srcB: string;
  videoARef: React.RefObject<HTMLVideoElement | null>;
  videoBRef: React.RefObject<HTMLVideoElement | null>;
  wipePosition: number;
  onWipePositionChange: (pos: number) => void;
}

export function VersionCompareViewport({
  mode,
  mediaA,
  mediaB,
  srcA,
  srcB,
  videoARef,
  videoBRef,
  wipePosition,
  onWipePositionChange,
}: VersionCompareViewportProps) {
  const wipeContainerRef = useRef<HTMLDivElement | null>(null);
  const isDraggingWipe = useRef(false);

  const handleWipeMove = useCallback(
    (clientX: number) => {
      if (!wipeContainerRef.current) return;
      const rect = wipeContainerRef.current.getBoundingClientRect();
      const relativeX = clientX - rect.left;
      const percent = Math.max(0, Math.min(100, (relativeX / rect.width) * 100));
      onWipePositionChange(percent);
    },
    [onWipePositionChange],
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingWipe.current = true;
    handleWipeMove(e.clientX);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDraggingWipe.current) {
      handleWipeMove(e.clientX);
    }
  };

  const handlePointerUp = () => {
    isDraggingWipe.current = false;
  };

  return (
    <main className="relative flex-1 min-h-0 bg-black flex items-center justify-center overflow-hidden">
      {/* Mode: Side-by-Side */}
      {mode === "side_by_side" && (
        <div className="grid grid-cols-2 h-full w-full divide-x divide-[#282a22]">
          {/* Version A Box */}
          <div className="relative flex flex-col h-full overflow-hidden bg-[#0d0e0b]">
            <div className="absolute top-3 left-3 z-10 flex items-center gap-2 pointer-events-none">
              <Badge size="sm" variant="lime" className="font-mono font-bold">
                A: V{mediaA.version_number ?? 1}
              </Badge>
              {mediaA.version_label && (
                <span className="rounded bg-black/70 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-xs">
                  {mediaA.version_label}
                </span>
              )}
            </div>
            <div className="flex-1 flex items-center justify-center p-2">
              <video
                ref={videoARef}
                src={srcA}
                playsInline
                className="max-h-full max-w-full object-contain"
              />
            </div>
          </div>

          {/* Version B Box */}
          <div className="relative flex flex-col h-full overflow-hidden bg-[#0d0e0b]">
            <div className="absolute top-3 left-3 z-10 flex items-center gap-2 pointer-events-none">
              <Badge size="sm" variant="surface" className="font-mono font-bold bg-[#73e6ff] text-ink">
                B: V{mediaB.version_number ?? 1}
              </Badge>
              {mediaB.version_label && (
                <span className="rounded bg-black/70 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-xs">
                  {mediaB.version_label}
                </span>
              )}
            </div>
            <div className="flex-1 flex items-center justify-center p-2">
              <video
                ref={videoBRef}
                src={srcB}
                playsInline
                className="max-h-full max-w-full object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* Mode: Curtain Wipe Slider */}
      {mode === "wipe" && (
        <div
          ref={wipeContainerRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="relative h-full w-full flex items-center justify-center cursor-ew-resize select-none overflow-hidden"
        >
          {/* Base Layer: Version B */}
          <video
            ref={videoBRef}
            src={srcB}
            playsInline
            className="absolute inset-0 h-full w-full object-contain pointer-events-none"
          />

          {/* Top Layer with Clip-path: Version A */}
          <video
            ref={videoARef}
            src={srcA}
            playsInline
            style={{
              clipPath: `polygon(0 0, ${wipePosition}% 0, ${wipePosition}% 100%, 0 100%)`,
            }}
            className="absolute inset-0 h-full w-full object-contain pointer-events-none"
          />

          {/* Vertical Divider Curtain Line */}
          <div
            style={{ left: `${wipePosition}%` }}
            className="absolute top-0 bottom-0 w-0.5 bg-lime z-20 shadow-[0_0_12px_#d8ff43] pointer-events-none"
          >
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 grid size-7 place-items-center rounded-full border border-ink bg-lime text-ink shadow-md font-mono text-[10px] font-black">
              W
            </div>
          </div>

          {/* Floating Badges */}
          <div className="absolute top-3 left-3 z-10 pointer-events-none">
            <Badge size="sm" variant="lime" className="font-mono font-bold shadow-md">
              Left: V{mediaA.version_number ?? 1} (A)
            </Badge>
          </div>
          <div className="absolute top-3 right-3 z-10 pointer-events-none">
            <Badge size="sm" variant="surface" className="font-mono font-bold bg-[#73e6ff] text-ink shadow-md">
              Right: V{mediaB.version_number ?? 1} (B)
            </Badge>
          </div>
        </div>
      )}

      {/* Mode: Difference Overlay Blend */}
      {mode === "difference" && (
        <div className="relative h-full w-full flex items-center justify-center overflow-hidden">
          {/* Base: Version B */}
          <video
            ref={videoBRef}
            src={srcB}
            playsInline
            className="absolute inset-0 h-full w-full object-contain pointer-events-none"
          />

          {/* Top: Version A with CSS mix-blend-mode: difference */}
          <video
            ref={videoARef}
            src={srcA}
            playsInline
            style={{ mixBlendMode: "difference" }}
            className="absolute inset-0 h-full w-full object-contain pointer-events-none"
          />

          <div className="absolute top-3 left-3 z-10 pointer-events-none flex items-center gap-2">
            <Badge size="sm" variant="surface" className="bg-[#22251d] border-[#383b30] text-lime font-mono">
              Difference Mode: Pixel changes light up
            </Badge>
          </div>
        </div>
      )}
    </main>
  );
}
