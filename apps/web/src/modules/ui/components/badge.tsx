"use client";

import React, { type HTMLAttributes, type ReactNode } from "react";

export type BadgeVariant =
  | "lime"
  | "surface"
  | "paper"
  | "ink"
  | "success"
  | "danger"
  | "outline";

export type BadgeSize = "sm" | "md" | "lg";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  className?: string;
}

export const badgeVariantClasses: Record<BadgeVariant, string> = {
  lime: "bg-lime text-ink border border-ink/20 font-bold",
  surface: "bg-surface text-ink border border-line font-medium",
  paper: "bg-paper text-ink border border-line font-medium",
  ink: "bg-ink text-white border border-ink font-bold",
  success: "bg-lime/20 text-ink border border-lime/60 font-bold",
  danger: "bg-red-50 text-red-700 border border-red-200 font-bold",
  outline: "bg-transparent text-ink border border-line font-medium",
};

export const badgeSizeClasses: Record<BadgeSize, string> = {
  sm: "h-5 px-1.5 text-[10px]",
  md: "h-6 px-2.5 text-xs",
  lg: "h-7 px-3 text-xs font-semibold",
};

export function Badge({
  children,
  variant = "surface",
  size = "md",
  dot = false,
  className = "",
  ...props
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg font-mono leading-none transition-colors ${badgeVariantClasses[variant]} ${badgeSizeClasses[size]} ${className}`.trim()}
      {...props}
    >
      {dot && (
        <span
          className={`size-1.5 rounded-full ${
            variant === "ink"
              ? "bg-lime"
              : variant === "danger"
              ? "bg-red-500"
              : variant === "success"
              ? "bg-[#6f8700] border border-ink/20"
              : variant === "lime"
              ? "bg-ink"
              : variant === "outline"
              ? "bg-ink"
              : "bg-muted"
          }`}
        />
      )}
      {children}
    </span>
  );
}
