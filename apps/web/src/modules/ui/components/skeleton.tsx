"use client";

import React, { type HTMLAttributes } from "react";

export type SkeletonVariant = "rounded" | "circle" | "pill" | "rect";

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  variant?: SkeletonVariant;
  animate?: boolean;
}

const variantClasses: Record<SkeletonVariant, string> = {
  rounded: "rounded-lg",
  circle: "rounded-full aspect-square",
  pill: "rounded-full",
  rect: "rounded-none",
};

export function Skeleton({
  variant = "rounded",
  animate = true,
  className = "",
  ...props
}: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`bg-line/70 dark:bg-zinc-800 ${variantClasses[variant]} ${
        animate ? "animate-pulse" : ""
      } ${className}`}
      {...props}
    />
  );
}

export interface SkeletonTextProps extends HTMLAttributes<HTMLDivElement> {
  lines?: number;
  gap?: "sm" | "md" | "lg";
  lastLineWidth?: string;
}

export function SkeletonText({
  lines = 3,
  gap = "sm",
  lastLineWidth = "w-3/5",
  className = "",
  ...props
}: SkeletonTextProps) {
  const gapClasses = {
    sm: "space-y-2",
    md: "space-y-3",
    lg: "space-y-4",
  };

  return (
    <div
      aria-hidden="true"
      className={`${gapClasses[gap]} ${className}`}
      {...props}
    >
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton
          key={index}
          className={`h-3.5 ${
            index === lines - 1 && lines > 1 ? lastLineWidth : "w-full"
          }`}
        />
      ))}
    </div>
  );
}
