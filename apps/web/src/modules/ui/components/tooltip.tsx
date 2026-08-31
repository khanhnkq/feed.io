"use client";

import React, { useState } from "react";

export type TooltipPosition = "top" | "bottom" | "left" | "right" | "top-left" | "top-right";

export const tooltipPositionClasses: Record<TooltipPosition, string> = {
  top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
  "top-left": "bottom-full left-0 mb-2",
  "top-right": "bottom-full right-0 mb-2",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
  left: "right-full top-1/2 -translate-y-1/2 mr-2",
  right: "left-full top-1/2 -translate-y-1/2 ml-2",
};

export function getTooltipPositionClass(position: TooltipPosition = "top"): string {
  return tooltipPositionClasses[position];
}

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: TooltipPosition;
  className?: string;
}

export function Tooltip({
  content,
  children,
  position = "top",
  className = "",
}: TooltipProps) {
  const [visible, setVisible] = useState(false);

  const positionClass = getTooltipPositionClass(position);

  return (
    <div
      className={`relative inline-flex ${className}`}
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div
          role="tooltip"
          className={`pointer-events-none absolute z-50 whitespace-nowrap rounded-lg border border-ink bg-paper px-2 py-1 text-[11px] font-bold text-ink shadow-[2px_2px_0_#11130f] animate-in fade-in zoom-in-95 duration-100 ${positionClass}`}
        >
          {content}
        </div>
      )}
    </div>
  );
}
