"use client";

import type { MediaResponse } from "@feedio/api-client";
import { ChevronsLeftRight } from "lucide-react";
import React, { useCallback, useRef, useState } from "react";
import { Badge } from "../../../ui";
import type { CompareMode } from "../../hooks/use_synchronized_playback";

interface ImageCompareViewportProps {
  mode: CompareMode;
  mediaA: MediaResponse;
  mediaB: MediaResponse;
  srcA: string;
  srcB: string;
  wipePosition: number;
  onWipePositionChange: (pos: number) => void;
  zoom?: number;
  onZoomChange?: (zoom: number) => void;
  panOffset?: { x: number; y: number };
  onPanOffsetChange?: (offset: { x: number; y: number }) => void;
  rotation?: number;
}

export function ImageCompareViewport({
  mode,
  mediaA,
  mediaB,
  srcA,
  srcB,
  wipePosition,
  onWipePositionChange,
  zoom = 1,
  onZoomChange,
  panOffset = { x: 0, y: 0 },
  onPanOffsetChange,
  rotation = 0,
}: ImageCompareViewportProps) {
  const wipeContainerRef = useRef<HTMLDivElement | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

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

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const zoomDelta = e.deltaY < 0 ? 0.15 : -0.15;
    const nextZoom = Math.max(0.25, Math.min(4, Number((zoom + zoomDelta).toFixed(2))));
    onZoomChange?.(nextZoom);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button === 1 || mode === "side_by_side") {
      setIsPanning(true);
      dragStartRef.current = {
        x: e.clientX - panOffset.x,
        y: e.clientY - panOffset.y,
      };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPanning) return;
    onPanOffsetChange?.({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const imageTransformStyle: React.CSSProperties = {
    transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom}) rotate(${rotation}deg)`,
    transformOrigin: "center center",
    transition: isPanning ? "none" : "transform 0.08s ease-out",
  };

  return (
    <main
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className={`relative flex-1 min-h-0 w-full h-full bg-black flex items-center justify-center overflow-hidden select-none ${
        isPanning ? "cursor-grabbing" : mode === "side_by_side" ? "cursor-grab" : ""
      }`}
    >
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

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={srcA}
          alt={mediaA.title}
          draggable={false}
          style={imageTransformStyle}
          className="max-h-[90%] max-w-[90%] object-contain pointer-events-none select-none"
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

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={srcB}
          alt={mediaB.title}
          draggable={false}
          style={imageTransformStyle}
          className="max-h-[90%] max-w-[90%] object-contain pointer-events-none select-none"
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
