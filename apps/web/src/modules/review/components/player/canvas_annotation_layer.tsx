"use client";

import React, { useCallback, useRef, useState } from "react";
import type {
  AnnotationShape,
  AnnotationTool,
} from "../../lib/annotation_serializer";
import { AnnotationToolbar } from "./annotation_toolbar";

interface InlineTextEditorState {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
}

interface CanvasAnnotationLayerProps {
  shapes: AnnotationShape[];
  onShapesChange: (shapes: AnnotationShape[]) => void;
  activeTool: AnnotationTool;
  onToolChange: (tool: AnnotationTool) => void;
  activeColor: string;
  onColorChange: (color: string) => void;
  strokeWidth: number;
  onStrokeWidthChange: (width: number) => void;
  readonlyShapes?: AnnotationShape[] | null;
  isPaused: boolean;
  hideToolbar?: boolean;
}

export function CanvasAnnotationLayer({
  shapes,
  onShapesChange,
  activeTool,
  onToolChange,
  activeColor,
  onColorChange,
  strokeWidth,
  onStrokeWidthChange,
  readonlyShapes,
  isPaused,
  hideToolbar = false,
}: CanvasAnnotationLayerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragOriginRef = useRef<{ x: number; y: number } | null>(null);
  const [currentShape, setCurrentShape] = useState<AnnotationShape | null>(null);
  const [inlineTextEditor, setInlineTextEditor] = useState<InlineTextEditorState | null>(null);

  const getRelativeCoordinates = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    return {
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    };
  };

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isPaused || activeTool === "select") return;
    const { x, y } = getRelativeCoordinates(e);
    const id = `shape-${Date.now()}`;
    dragOriginRef.current = { x, y };

    if (activeTool === "brush") {
      setCurrentShape({
        id,
        type: "brush",
        points: [x, y],
        color: activeColor,
        strokeWidth,
      });
    } else if (activeTool === "arrow") {
      setCurrentShape({
        id,
        type: "arrow",
        startX: x,
        startY: y,
        endX: x,
        endY: y,
        color: activeColor,
        strokeWidth,
      });
    } else if (activeTool === "rect" || activeTool === "text") {
      setCurrentShape({
        id,
        type: "rect",
        x,
        y,
        width: 0,
        height: 0,
        color: activeColor,
        strokeWidth: activeTool === "text" ? 1.5 : strokeWidth,
      });
    } else if (activeTool === "circle") {
      setCurrentShape({
        id,
        type: "circle",
        cx: x,
        cy: y,
        rx: 0,
        ry: 0,
        color: activeColor,
        strokeWidth,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!currentShape || !dragOriginRef.current) return;
    const { x, y } = getRelativeCoordinates(e);
    const ox = dragOriginRef.current.x;
    const oy = dragOriginRef.current.y;

    if (currentShape.type === "brush") {
      setCurrentShape({
        ...currentShape,
        points: [...currentShape.points, x, y],
      });
    } else if (currentShape.type === "arrow") {
      setCurrentShape({
        ...currentShape,
        startX: ox,
        startY: oy,
        endX: x,
        endY: y,
      });
    } else if (currentShape.type === "rect") {
      setCurrentShape({
        ...currentShape,
        x: Math.min(ox, x),
        y: Math.min(oy, y),
        width: Math.abs(x - ox),
        height: Math.abs(y - oy),
      });
    } else if (currentShape.type === "circle") {
      setCurrentShape({
        ...currentShape,
        cx: (ox + x) / 2,
        cy: (oy + y) / 2,
        rx: Math.abs(x - ox) / 2,
        ry: Math.abs(y - oy) / 2,
      });
    }
  };

  const commitInlineText = () => {
    if (!inlineTextEditor) return;
    const content = inlineTextEditor.text.trim();
    if (content) {
      const id = `shape-${Date.now()}`;
      onShapesChange([
        ...shapes,
        {
          id,
          type: "text",
          x: inlineTextEditor.x,
          y: inlineTextEditor.y,
          text: content,
          color: activeColor,
          strokeWidth,
          fontSize: 14,
        },
      ]);
    }
    setInlineTextEditor(null);
  };

  const handleMouseUp = () => {
    if (activeTool === "text" && currentShape?.type === "rect") {
      const minW = Math.max(16, currentShape.width);
      const minH = Math.max(6, currentShape.height);
      setInlineTextEditor({
        x: currentShape.x,
        y: currentShape.y,
        width: minW,
        height: minH,
        text: "",
      });
      setCurrentShape(null);
      dragOriginRef.current = null;
      return;
    }

    if (currentShape) {
      onShapesChange([...shapes, currentShape]);
      setCurrentShape(null);
    }
    dragOriginRef.current = null;
  };

  const handleUndo = useCallback(() => {
    if (shapes.length > 0) {
      onShapesChange(shapes.slice(0, -1));
    }
  }, [shapes, onShapesChange]);

  const handleClear = useCallback(() => {
    onShapesChange([]);
  }, [onShapesChange]);

  const renderShape = (shape: AnnotationShape) => {
    switch (shape.type) {
      case "brush": {
        if (shape.points.length < 4) return null;
        let pathData = `M ${shape.points[0]} ${shape.points[1]}`;
        for (let i = 2; i < shape.points.length; i += 2) {
          pathData += ` L ${shape.points[i]} ${shape.points[i + 1]}`;
        }
        return (
          <path
            key={shape.id}
            d={pathData}
            fill="none"
            stroke={shape.color}
            strokeWidth={shape.strokeWidth * 0.4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        );
      }

      case "arrow": {
        const markerId = `arrowhead-${shape.id}`;
        return (
          <g key={shape.id}>
            <defs>
              <marker
                id={markerId}
                markerWidth="6"
                markerHeight="6"
                refX="5"
                refY="3"
                orient="auto"
              >
                <path d="M0,0 L0,6 L6,3 z" fill={shape.color} />
              </marker>
            </defs>
            <line
              x1={`${shape.startX}%`}
              y1={`${shape.startY}%`}
              x2={`${shape.endX}%`}
              y2={`${shape.endY}%`}
              stroke={shape.color}
              strokeWidth={shape.strokeWidth * 0.4}
              markerEnd={`url(#${markerId})`}
            />
          </g>
        );
      }

      case "rect": {
        const isDraft = activeTool === "text" && currentShape?.id === shape.id;
        return (
          <rect
            key={shape.id}
            x={`${shape.x}%`}
            y={`${shape.y}%`}
            width={`${shape.width}%`}
            height={`${shape.height}%`}
            fill={isDraft ? `${shape.color}20` : "none"}
            stroke={shape.color}
            strokeWidth={shape.strokeWidth * 0.4}
            strokeDasharray={isDraft ? "2,2" : undefined}
          />
        );
      }

      case "circle":
        return (
          <ellipse
            key={shape.id}
            cx={`${shape.cx}%`}
            cy={`${shape.cy}%`}
            rx={`${shape.rx}%`}
            ry={`${shape.ry}%`}
            fill="none"
            stroke={shape.color}
            strokeWidth={shape.strokeWidth * 0.4}
          />
        );

      case "text":
        return (
          <text
            key={shape.id}
            x={`${shape.x}%`}
            y={`${shape.y + 3}%`}
            fill={shape.color}
            fontSize={`${(shape.fontSize || 14) * 0.25}%`}
            fontWeight="bold"
            className="select-none font-sans"
          >
            {shape.text}
          </text>
        );
    }

    return null;
  };

  const activeShapes = readonlyShapes || shapes;

  return (
    <div className="absolute inset-0 pointer-events-none z-20">
      {/* SVG Canvas */}
      <svg
        ref={svgRef}
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className={`size-full ${isPaused && activeTool !== "select" ? "pointer-events-auto cursor-crosshair" : ""}`}
      >
        {activeShapes.map(renderShape)}
        {currentShape && renderShape(currentShape)}
      </svg>

      {/* Inline Text Box Editor directly on Canvas */}
      {inlineTextEditor && (
        <div
          className="pointer-events-auto absolute z-30 flex flex-col"
          style={{
            left: `${inlineTextEditor.x}%`,
            top: `${inlineTextEditor.y}%`,
            width: inlineTextEditor.width > 20 ? `${inlineTextEditor.width}%` : "200px",
            maxWidth: "90%",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <textarea
            ref={(el) => el?.focus()}
            value={inlineTextEditor.text}
            onChange={(e) =>
              setInlineTextEditor({ ...inlineTextEditor, text: e.target.value })
            }
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                commitInlineText();
              } else if (e.key === "Escape") {
                e.preventDefault();
                setInlineTextEditor(null);
              }
            }}
            onBlur={commitInlineText}
            placeholder="Type note... (↵ Enter)"
            rows={Math.max(2, inlineTextEditor.text.split("\n").length)}
            className="w-full resize-none rounded-lg border-2 border-dashed bg-paper/95 p-2 font-sans text-xs font-semibold leading-relaxed text-ink shadow-xl backdrop-blur-md focus:outline-none"
            style={{
              borderColor: activeColor,
              color: activeColor === "#11130F" ? "#11130F" : activeColor,
            }}
          />
        </div>
      )}

      {/* Floating Toolbar when paused and not hidden */}
      {isPaused && !hideToolbar && (
        <AnnotationToolbar
          activeTool={activeTool}
          onToolChange={onToolChange}
          activeColor={activeColor}
          onColorChange={onColorChange}
          strokeWidth={strokeWidth}
          onStrokeWidthChange={onStrokeWidthChange}
          shapesCount={shapes.length}
          onUndo={handleUndo}
          onClear={handleClear}
        />
      )}
    </div>
  );
}
