"use client";

import { Check, Copy, MapPin } from "lucide-react";
import React, { useState } from "react";

export type TimecodeBadgeSize = "sm" | "md" | "lg";
export type TimecodeBadgeVariant = "default" | "lime" | "outline" | "ghost";

export const timecodeBadgeSizeClasses: Record<TimecodeBadgeSize, string> = {
  sm: "px-1.5 py-0.5 text-[10px]",
  md: "px-2 py-0.5 text-[11px]",
  lg: "px-2.5 py-1 text-xs",
};

export const timecodeBadgeVariantClasses: Record<TimecodeBadgeVariant, string> = {
  default:
    "border-line bg-transparent text-ink hover:bg-surface hover:border-ink hover:shadow-[2px_2px_0_#d8ff43]",
  lime: "border-ink bg-lime text-ink font-bold shadow-[2px_2px_0_#11130f]",
  outline: "border-line bg-transparent text-ink hover:border-ink hover:bg-surface",
  ghost: "border-transparent bg-transparent text-muted hover:text-ink hover:bg-surface/50",
};

export function getTimecodeBadgeClassName(
  size: TimecodeBadgeSize = "md",
  variant: TimecodeBadgeVariant = "default",
  className = "",
  hasClick = false,
): string {
  return `inline-flex items-center gap-1.5 rounded-lg border font-mono font-bold transition select-none ${
    hasClick ? "cursor-pointer active:scale-95" : ""
  } ${timecodeBadgeSizeClasses[size]} ${timecodeBadgeVariantClasses[variant]} ${className}`;
}

export interface TimecodeBadgeProps {
  timecode: string; // e.g. "00:01:23:12"
  frameNumber?: number;
  fps?: number;
  onClick?: () => void;
  copyable?: boolean;
  size?: TimecodeBadgeSize;
  variant?: TimecodeBadgeVariant;
  className?: string;
}

export function TimecodeBadge({
  timecode,
  frameNumber,
  fps,
  onClick,
  copyable = false,
  size = "md",
  variant = "default",
  className = "",
}: TimecodeBadgeProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(timecode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
      className={getTimecodeBadgeClassName(size, variant, className, Boolean(onClick))}
      title={frameNumber !== undefined ? `Frame ${frameNumber} (${fps ? `${fps}fps` : ""})` : timecode}
    >
      <MapPin size={12} className="shrink-0 text-ink/70" />
      <span>{timecode}</span>

      {frameNumber !== undefined && (
        <span className="font-normal text-muted text-[10px]">
          (F{frameNumber})
        </span>
      )}

      {copyable && (
        <button
          type="button"
          onClick={handleCopy}
          className="ml-0.5 text-muted hover:text-ink transition"
          title="Copy timecode"
        >
          {copied ? <Check size={11} className="text-ink font-bold" /> : <Copy size={11} />}
        </button>
      )}
    </div>
  );
}
