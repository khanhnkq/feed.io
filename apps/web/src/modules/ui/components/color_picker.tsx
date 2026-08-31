"use client";

import React from "react";

export interface ColorSwatch {
  name: string;
  value: string;
}

export const DEFAULT_FEEDIO_PALETTE: ColorSwatch[] = [
  { name: "Feed Lime", value: "#D8FF43" },
  { name: "Signal Red", value: "#EF4444" },
  { name: "Cyan Blue", value: "#3B82F6" },
  { name: "Amber Yellow", value: "#EAB308" },
  { name: "Pure White", value: "#FFFFFF" },
  { name: "Deep Ink", value: "#11130F" },
];

export interface ColorPickerProps {
  selectedColor: string;
  onSelectColor: (color: string) => void;
  colors?: ColorSwatch[];
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function ColorPicker({
  selectedColor,
  onSelectColor,
  colors = DEFAULT_FEEDIO_PALETTE,
  size = "md",
  className = "",
}: ColorPickerProps) {
  const sizeClasses = {
    sm: "size-5",
    md: "size-6",
    lg: "size-8",
  }[size];

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      {colors.map((c) => {
        const isSelected = selectedColor.toLowerCase() === c.value.toLowerCase();
        return (
          <button
            key={c.value}
            type="button"
            onClick={() => onSelectColor(c.value)}
            className={`group relative rounded-full border transition-all duration-150 active:scale-90 ${sizeClasses} ${
              isSelected
                ? "scale-115 border-ink ring-2 ring-ink ring-offset-2 ring-offset-paper shadow-xs"
                : "border-black/20 hover:scale-105 hover:border-ink"
            }`}
            style={{ backgroundColor: c.value }}
            title={`${c.name} (${c.value})`}
          >
            {/* Inner checkmark dot for high contrast */}
            {isSelected && (
              <span
                className={`absolute inset-0 m-auto size-1.5 rounded-full ${
                  c.value.toLowerCase() === "#ffffff" || c.value.toLowerCase() === "#d8ff43"
                    ? "bg-ink"
                    : "bg-white"
                }`}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
