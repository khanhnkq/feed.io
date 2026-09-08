"use client";

import { useState } from "react";

import { GuestAnnotationData } from "./guest_types";

interface UseGuestDrawingProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  drawColor?: string;
}

export function useGuestDrawing({
  canvasRef,
  videoRef,
  isPlaying,
  setIsPlaying,
  drawColor = "#d8ff43",
}: UseGuestDrawingProps) {
  const [activeTool, setActiveTool] = useState<"none" | "pen" | "rect" | "arrow">("none");
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<{ x: number; y: number }[]>([]);
  const [currentAnnotation, setCurrentAnnotation] = useState<GuestAnnotationData | null>(null);

  const drawArrow = (
    ctx: CanvasRenderingContext2D,
    fromx: number,
    fromy: number,
    tox: number,
    toy: number,
  ) => {
    const headlen = 12;
    const angle = Math.atan2(toy - fromy, tox - fromx);
    ctx.beginPath();
    ctx.moveTo(fromx, fromy);
    ctx.lineTo(tox, toy);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(tox, toy);
    ctx.lineTo(
      tox - headlen * Math.cos(angle - Math.PI / 6),
      toy - headlen * Math.sin(angle - Math.PI / 6),
    );
    ctx.lineTo(
      tox - headlen * Math.cos(angle + Math.PI / 6),
      toy - headlen * Math.sin(angle + Math.PI / 6),
    );
    ctx.closePath();
    ctx.fillStyle = drawColor;
    ctx.fill();
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool === "none" || !canvasRef.current) return;
    if (isPlaying && videoRef.current) {
      videoRef.current.pause();
      setIsPlaying(false);
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvasRef.current.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvasRef.current.height;

    setIsDrawing(true);
    setDrawingPoints([{ x, y }]);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || activeTool === "none" || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvasRef.current.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvasRef.current.height;

    const newPoints = [...drawingPoints, { x, y }];
    setDrawingPoints(newPoints);

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    ctx.strokeStyle = drawColor;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";

    if (activeTool === "pen") {
      ctx.beginPath();
      newPoints.forEach((pt, i) => {
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();
    } else if (activeTool === "rect" && newPoints.length > 1) {
      const start = newPoints[0];
      const curr = newPoints[newPoints.length - 1];
      ctx.strokeRect(start.x, start.y, curr.x - start.x, curr.y - start.y);
    } else if (activeTool === "arrow" && newPoints.length > 1) {
      const start = newPoints[0];
      const end = newPoints[newPoints.length - 1];
      drawArrow(ctx, start.x, start.y, end.x, end.y);
    }
  };

  const handleCanvasMouseUp = () => {
    if (!isDrawing || activeTool === "none") return;
    setIsDrawing(false);

    if (drawingPoints.length > 1) {
      const flatPoints = drawingPoints.flatMap((p) => [Math.round(p.x), Math.round(p.y)]);
      setCurrentAnnotation({
        type: activeTool,
        points: flatPoints,
        color: drawColor,
        strokeWidth: 3,
      });
    }
  };

  const clearAnnotation = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setDrawingPoints([]);
    setCurrentAnnotation(null);
  };

  return {
    activeTool,
    setActiveTool,
    currentAnnotation,
    clearAnnotation,
    handleCanvasMouseDown,
    handleCanvasMouseMove,
    handleCanvasMouseUp,
  };
}
