"use client";

import React, { useState } from "react";

export interface RangeSliderProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
  formatValue?: (val: number) => string;
  showTooltip?: boolean;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export function calculateSliderPercentage(value: number, min = 0, max = 100): number {
  if (max <= min) return 0;
  const clamped = Math.max(min, Math.min(max, value));
  return ((clamped - min) / (max - min)) * 100;
}

export function RangeSlider({
  value,
  min = 0,
  max = 100,
  step = 1,
  onChange,
  formatValue = (v) => String(v),
  showTooltip = true,
  label,
  disabled = false,
  className = "",
}: RangeSliderProps) {
  const [isHovering, setIsHovering] = useState(false);

  const percentage = calculateSliderPercentage(value, min, max);

  return (
    <div className={`relative flex flex-col gap-1 w-full ${className}`}>
      {label && (
        <div className="flex items-center justify-between text-xs font-semibold text-ink">
          <span>{label}</span>
          <span className="font-mono text-[11px] text-muted">{formatValue(value)}</span>
        </div>
      )}

      <div
        className="relative flex items-center h-6 cursor-pointer"
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {/* Floating Tooltip */}
        {showTooltip && isHovering && (
          <div
            className="pointer-events-none absolute bottom-full mb-1 z-30 -translate-x-1/2 rounded-lg border border-ink bg-paper px-1.5 py-0.5 font-mono text-[10px] font-bold text-ink shadow-[2px_2px_0_#11130f] animate-in fade-in zoom-in-95 duration-100"
            style={{ left: `${percentage}%` }}
          >
            {formatValue(value)}
          </div>
        )}

        {/* Base Track */}
        <div className="relative h-2 w-full overflow-hidden rounded-full border border-line bg-surface">
          {/* Active Fill Track */}
          <div
            className="h-full bg-lime border-r border-ink transition-all duration-75"
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Native Range Input (Transparent Overlay for Accessibility) */}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 size-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />

        {/* Visible Thumb Handle */}
        <div
          className="pointer-events-none absolute size-4 -translate-x-1/2 rounded-full border-2 border-ink bg-paper shadow-md transition-all duration-75"
          style={{ left: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
