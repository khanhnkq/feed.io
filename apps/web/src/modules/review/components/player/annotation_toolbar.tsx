"use client";

import {
  Circle as CircleIcon,
  MousePointer,
  MoveUpRight,
  Pencil,
  RotateCcw,
  Square,
  Trash2,
  Type,
} from "lucide-react";
import React from "react";
import { ColorPicker, DEFAULT_FEEDIO_PALETTE } from "../../../ui/components/color_picker";
import type { AnnotationTool } from "../../lib/annotation_serializer";

export interface AnnotationToolbarProps {
  activeTool: AnnotationTool;
  onToolChange: (tool: AnnotationTool) => void;
  activeColor: string;
  onColorChange: (color: string) => void;
  strokeWidth: number;
  onStrokeWidthChange: (width: number) => void;
  shapesCount: number;
  onUndo: () => void;
  onClear: () => void;
}

const TOOLS: { id: AnnotationTool; label: string; icon: React.ComponentType<{ size: number }> }[] = [
  { id: "select", label: "Select pointer", icon: MousePointer },
  { id: "brush", label: "Brush", icon: Pencil },
  { id: "arrow", label: "Arrow", icon: MoveUpRight },
  { id: "rect", label: "Rectangle", icon: Square },
  { id: "circle", label: "Circle", icon: CircleIcon },
  { id: "text", label: "Text Region", icon: Type },
];

export function AnnotationToolbar({
  activeTool,
  onToolChange,
  activeColor,
  onColorChange,
  strokeWidth,
  onStrokeWidthChange,
  shapesCount,
  onUndo,
  onClear,
}: AnnotationToolbarProps) {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="pointer-events-auto absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 rounded-xl border border-line bg-paper px-2.5 py-1.5 text-ink shadow-[4px_4px_0_#11130f]"
    >
      {/* Tool selectors */}
      {TOOLS.map((t) => {
        const Icon = t.icon;
        const isActive = activeTool === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToolChange(t.id);
            }}
            className={`grid size-8 place-items-center rounded-lg text-xs transition ${
              isActive
                ? "bg-lime text-ink border border-ink font-bold shadow-[1px_1px_0_#11130f]"
                : "text-ink hover:border hover:border-line hover:bg-surface"
            }`}
            title={t.label}
          >
            <Icon size={15} />
          </button>
        );
      })}

      <div className="mx-1 h-5 w-px bg-line" />

      {/* Color Palette */}
      <ColorPicker
        colors={DEFAULT_FEEDIO_PALETTE}
        selectedColor={activeColor}
        onSelectColor={onColorChange}
        size="sm"
      />

      <div className="mx-1 h-5 w-px bg-line" />

      {/* Stroke Width */}
      <div className="flex items-center gap-1">
        {[2, 4, 6].map((w) => (
          <button
            key={w}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onStrokeWidthChange(w);
            }}
            className={`grid size-6 place-items-center rounded text-[10px] font-bold transition ${
              strokeWidth === w
                ? "bg-ink text-paper border border-ink"
                : "text-muted hover:border hover:border-line hover:bg-surface hover:text-ink"
            }`}
            title={`Stroke ${w}px`}
          >
            {w}px
          </button>
        ))}
      </div>

      <div className="mx-1 h-5 w-px bg-line" />

      {/* Undo and Clear */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onUndo();
        }}
        disabled={shapesCount === 0}
        className="grid size-8 place-items-center rounded-lg text-ink transition hover:border hover:border-line hover:bg-surface disabled:opacity-30"
        title="Undo stroke"
      >
        <RotateCcw size={14} />
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onClear();
        }}
        disabled={shapesCount === 0}
        className="grid size-8 place-items-center rounded-lg text-red-500 transition hover:border hover:border-red-300 hover:bg-red-50 disabled:opacity-30"
        title="Clear all drawings"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}
