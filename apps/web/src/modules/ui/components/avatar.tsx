"use client";

import React from "react";

export interface AvatarProps {
  initials?: string;
  name?: string | null;
  src?: string | null;
  tone?: "dark" | "lime" | "surface";
  size?: "xs" | "sm" | "md";
  className?: string;
}

export function getInitials(name?: string | null): string {
  if (!name) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function Avatar({
  initials,
  name,
  src,
  tone = "dark",
  size = "sm",
  className = "",
}: AvatarProps) {
  const displayInitials = initials || getInitials(name);

  const sizeClasses = {
    xs: "size-5 text-[9px]",
    sm: "size-6 text-[10px]",
    md: "size-8 text-[12px]",
  }[size];

  const toneClasses = {
    dark: "bg-ink text-paper border border-ink/20",
    lime: "bg-lime text-ink border border-ink font-bold",
    surface: "bg-surface text-ink border border-line",
  }[tone];

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name || "User avatar"}
        className={`shrink-0 rounded-full object-cover border border-line ${sizeClasses} ${className}`}
      />
    );
  }

  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full font-bold select-none ${sizeClasses} ${toneClasses} ${className}`}
    >
      {displayInitials}
    </span>
  );
}
