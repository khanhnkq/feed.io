"use client";

import type { MediaResponse } from "@feedio/api-client";
import { ChevronsLeftRight } from "lucide-react";
import React, { useCallback, useRef } from "react";
import { Badge } from "../../../ui";
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
    handleWipeMove(e.clientX);

    const onPointerMove = (ev: PointerEvent) => {
      handleWipeMove(ev.clientX);
    };

    const onPointerUp = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  return (
    <main className="relative flex-1 min-h-0 w-full h-full bg-black flex items-center justify-center overflow-hidden select-none">
      {/* Pane A: Version A (Main layer, clipped on wipe, difference blend on difference) */}
      <div
        className={`absolute overflow-hidden ${
          mode === "side_by_side"
            ? "inset-y-0 left-0 w-1/2 flex items-center justify-center border-r border-[#282a22] bg-[#0d0e0b] z-10"
            : "inset-0 w-full h-full flex items-center justify-center z-10 pointer-events-none"
        }`}
        style={{
          clipPath:
            mode === "wipe"
              ? `polygon(0 0, ${wipePosition}% 0, ${wipePosition}% 100%, 0 100%)`
              : undefined,
        }}
      >
        {/* Floating Badge A */}
        <div className="absolute top-3 left-3 z-10 flex items-center gap-2 pointer-events-none">
          <Badge size="sm" variant="lime" className="font-mono font-bold shadow-xs">
            {`A: V${mediaA.version_number ?? 1}`}
          </Badge>
          {mediaA.version_label && (
            <span className="rounded bg-black/70 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-xs">
              {mediaA.version_label}
            </span>
          )}
        </div>

        <video
          ref={videoARef}
          src={srcA}
          playsInline
          className="max-h-full max-w-full object-contain pointer-events-none"
        />
      </div>

      {/* Pane B: Version B (Base layer on wipe, right half on side-by-side) */}
      <div
        className={`absolute overflow-hidden ${
          mode === "side_by_side"
            ? "inset-y-0 right-0 w-1/2 flex items-center justify-center bg-[#0d0e0b] z-10"
            : "inset-0 w-full h-full flex items-center justify-center z-0 pointer-events-none"
        }`}
        style={{
          clipPath:
            mode === "wipe"
              ? `polygon(${wipePosition}% 0, 100% 0, 100% 100%, ${wipePosition}% 100%)`
              : undefined,
        }}
      >
        {/* Floating Badge B */}
        <div
          className={`absolute top-3 z-10 flex items-center gap-2 pointer-events-none ${
            mode === "wipe" ? "right-3" : "left-3"
          }`}
        >
          <Badge size="sm" variant="surface" className="font-mono font-bold shadow-xs">
            {`B: V${mediaB.version_number ?? 1}`}
          </Badge>
          {mediaB.version_label && (
            <span className="rounded bg-black/70 px-2 py-0.5 text-xs font-medium text-white backdrop-blur-xs">
              {mediaB.version_label}
            </span>
          )}
        </div>

        <video
          ref={videoBRef}
          src={srcB}
          playsInline
          className="max-h-full max-w-full object-contain pointer-events-none"
        />
      </div>



      {/* Wipe Dragging Overlay (Active in Wipe mode) */}
      {mode === "wipe" && (
        <div
          ref={wipeContainerRef}
          onPointerDown={handlePointerDown}
          className="absolute inset-0 z-30 cursor-ew-resize select-none"
        >
          {/* Vertical Divider Curtain Line */}
          <div
            style={{ left: `${wipePosition}%` }}
            className="absolute top-0 bottom-0 w-0.5 bg-lime shadow-[0_0_12px_#d8ff43] pointer-events-none"
          >
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 grid size-7 place-items-center rounded-full border border-ink bg-lime text-ink shadow-[2px_2px_0_#11130f]">
              <ChevronsLeftRight size={13} className="text-ink" />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
