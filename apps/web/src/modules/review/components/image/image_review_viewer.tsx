"use client";

import type { CommentResponse, MediaResponse } from "@feedio/api-client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import type { AnnotationShape, AnnotationTool } from "../../lib/annotation_serializer";
import { AnnotationToolbar } from "../player/annotation_toolbar";
import { CanvasAnnotationLayer } from "../player/canvas_annotation_layer";
import { ImageControls } from "./image_controls";

export interface ImageReviewViewerProps {
  media: MediaResponse;
  comments?: CommentResponse[];
  activeComment: CommentResponse | null;
  onSelectComment?: (comment: CommentResponse | null) => void;
  shapes: AnnotationShape[];
  onShapesChange: (shapes: AnnotationShape[]) => void;
}

export function ImageReviewViewer({
  media,
  activeComment,
  shapes,
  onShapesChange,
}: ImageReviewViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  // Pan & Zoom state
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Annotation tools state
  const [activeTool, setActiveTool] = useState<AnnotationTool>("select");
  const [activeColor, setActiveColor] = useState("#D8FF43");
  const [strokeWidth, setStrokeWidth] = useState(3);

  const imgSrc = media.stream_url || media.proxy_url || media.thumbnail_url || "";

  // Undo & Clear handlers for annotations
  const handleUndo = useCallback(() => {
    if (shapes.length > 0) {
      onShapesChange(shapes.slice(0, -1));
    }
  }, [shapes, onShapesChange]);

  const handleClear = useCallback(() => {
    onShapesChange([]);
  }, [onShapesChange]);

  // Reset view handlers
  const handleResetZoom = useCallback(() => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  const handleResetView = useCallback(() => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
    setRotation(0);
  }, []);

  const handleRotate = useCallback((delta: number) => {
    setRotation((prev) => {
      const next = (prev + delta) % 360;
      return next < 0 ? next + 360 : next;
    });
  }, []);

  // Fullscreen handler
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const zoomDelta = e.deltaY < 0 ? 0.15 : -0.15;
    setZoom((prev) => Math.max(0.25, Math.min(4, Number((prev + zoomDelta).toFixed(2)))));
  };

  // Drag-to-pan handlers (Spacebar or Middle Click or Pan Tool)
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isSpacePressed || e.button === 1 || activeTool === "select") {
      setIsPanning(true);
      dragStartRef.current = {
        x: e.clientX - panOffset.x,
        y: e.clientY - panOffset.y,
      };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isPanning) return;
    setPanOffset({
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    });
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl?.tagName === "INPUT" ||
        activeEl?.tagName === "TEXTAREA" ||
        (activeEl as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        setIsSpacePressed(true);
      } else if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        setZoom((prev) => Math.min(4, Number((prev + 0.25).toFixed(2))));
      } else if (e.key === "-" || e.key === "_") {
        e.preventDefault();
        setZoom((prev) => Math.max(0.25, Number((prev - 0.25).toFixed(2))));
      } else if (e.key === "0") {
        e.preventDefault();
        handleResetView();
      } else if (e.key.toLowerCase() === "f") {
        e.preventDefault();
        toggleFullscreen();
      } else if (e.key.toLowerCase() === "r") {
        e.preventDefault();
        handleRotate(90);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsSpacePressed(false);
        setIsPanning(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [handleResetView, toggleFullscreen, handleRotate]);

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col h-full w-full bg-paper select-none overflow-hidden"
    >
      {/* Image Stage Container */}
      <div
        className={`relative flex-1 min-h-0 flex items-center justify-center bg-[#0D0E0C] overflow-hidden ${
          isSpacePressed || isPanning ? "cursor-grab active:cursor-grabbing" : ""
        }`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Floating Annotation Toolbar: Fixed at viewport top, completely unaffected by image zoom/pan */}
        <AnnotationToolbar
          activeTool={activeTool}
          onToolChange={setActiveTool}
          activeColor={activeColor}
          onColorChange={setActiveColor}
          strokeWidth={strokeWidth}
          onStrokeWidthChange={setStrokeWidth}
          shapesCount={shapes.length}
          onUndo={handleUndo}
          onClear={handleClear}
        />

        {/* Transformable Canvas Stage */}
        <div
          ref={stageRef}
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom}) rotate(${rotation}deg)`,
            transformOrigin: "center center",
            transition: isPanning ? "none" : "transform 0.08s ease-out",
          }}
          className="relative max-h-[92%] max-w-[92%] flex items-center justify-center shadow-2xl"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imgSrc}
            alt={media.title}
            className="max-h-[80vh] max-w-[80vw] object-contain rounded select-none pointer-events-none"
            draggable={false}
          />

          {/* Vector Annotation Drawing Layer (Toolbar is hidden here so it stays fixed to viewport) */}
          <CanvasAnnotationLayer
            shapes={shapes}
            onShapesChange={onShapesChange}
            activeTool={activeTool}
            onToolChange={setActiveTool}
            activeColor={activeColor}
            onColorChange={setActiveColor}
            strokeWidth={strokeWidth}
            onStrokeWidthChange={setStrokeWidth}
            readonlyShapes={
              activeComment?.annotation_data
                ? (activeComment.annotation_data as { shapes?: AnnotationShape[] }).shapes
                : null
            }
            isPaused={true}
            hideToolbar={true}
          />
        </div>
      </div>

      {/* Image Bottom Control Deck */}
      <ImageControls
        zoom={zoom}
        onZoomChange={setZoom}
        onResetZoom={handleResetZoom}
        rotation={rotation}
        onRotate={handleRotate}
        onResetView={handleResetView}
        width={media.width}
        height={media.height}
        fileSizeBytes={media.file_size_bytes}
        mimeType={media.mime_type}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
      />
    </div>
  );
}
