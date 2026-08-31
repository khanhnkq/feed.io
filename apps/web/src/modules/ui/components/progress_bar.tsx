"use client";

import React, { type HTMLAttributes } from "react";

export type ProgressBarVariant = "ink" | "lime" | "danger";
export type ProgressBarSize = "sm" | "md" | "lg";

export interface ProgressBarProps extends HTMLAttributes<HTMLDivElement> {
  value?: number | "indeterminate";
  variant?: ProgressBarVariant;
  size?: ProgressBarSize;
  showValue?: boolean;
  label?: string;
  className?: string;
}

export const progressBarSizeClasses: Record<ProgressBarSize, string> = {
  sm: "h-1",
  md: "h-1.5",
  lg: "h-2.5",
};

export const progressBarVariantClasses: Record<ProgressBarVariant, string> = {
  ink: "bg-ink",
  lime: "bg-lime",
  danger: "bg-red-600",
};

export function ProgressBar({
  value = "indeterminate",
  variant = "ink",
  size = "md",
  showValue = false,
  label,
  className = "",
  ...props
}: ProgressBarProps) {
  const isIndeterminate = value === "indeterminate";
  const numericValue = typeof value === "number" ? Math.min(100, Math.max(0, value)) : 0;

  return (
    <div className={`w-full space-y-1.5 ${className}`.trim()} {...props}>
      {(label || showValue) && (
        <div className="flex items-center justify-between text-xs font-mono text-muted">
          {label && <span>{label}</span>}
          {showValue && !isIndeterminate && <span className="font-bold text-ink">{numericValue}%</span>}
        </div>
      )}

      <div
        role="progressbar"
        aria-valuenow={isIndeterminate ? undefined : numericValue}
        aria-valuemin={0}
        aria-valuemax={100}
        className={`w-full overflow-hidden rounded-full border border-line bg-paper ${progressBarSizeClasses[size]}`}
      >
        {isIndeterminate ? (
          <div
            className={`h-full w-2/5 rounded-full transition-all duration-300 ${
              variant === "lime" ? "bg-lime" : "bg-lime border-r border-ink/30"
            }`}
          />
        ) : (
          <div
            className={`h-full rounded-full transition-all duration-300 ${progressBarVariantClasses[variant]}`}
            style={{ width: `${numericValue}%` }}
          />
        )}
      </div>
    </div>
  );
}
