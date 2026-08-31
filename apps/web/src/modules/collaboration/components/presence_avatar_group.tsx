"use client";

import React from "react";
import type { PresenceUser } from "../types";
import { Tooltip } from "../../ui/components/tooltip";

export interface PresenceAvatarGroupProps {
  users: PresenceUser[];
  maxVisible?: number;
  className?: string;
}

const AVATAR_COLORS = [
  "bg-violet-600 text-white",
  "bg-emerald-600 text-white",
  "bg-amber-600 text-white",
  "bg-cyan-600 text-white",
  "bg-rose-600 text-white",
  "bg-indigo-600 text-white",
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || "U";
}

function getColorForUser(userId: string): string {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

export function PresenceAvatarGroup({
  users,
  maxVisible = 4,
  className = "",
}: PresenceAvatarGroupProps) {
  if (!users || users.length === 0) return null;

  const visibleUsers = users.slice(0, maxVisible);
  const remainingCount = users.length - maxVisible;

  return (
    <div
      className={`flex items-center -space-x-2 overflow-hidden py-1 ${className}`}
      data-testid="presence-avatar-group"
    >
      {visibleUsers.map((user) => {
        const initials = getInitials(user.name);
        const colorClass = getColorForUser(user.user_id);
        const tooltipText = user.email ? `${user.name} (${user.email})` : user.name;

        return (
          <Tooltip key={user.user_id} content={`Viewing now: ${tooltipText}`} position="bottom">
            <div
              className={`relative inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-slate-900 text-xs font-semibold shadow-sm transition-transform hover:z-10 hover:scale-110 ${colorClass}`}
              data-testid={`presence-avatar-${user.user_id}`}
            >
              {user.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.avatar_url}
                  alt={user.name}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                <span>{initials}</span>
              )}
              {/* Online pulse dot */}
              <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-emerald-400 ring-1 ring-slate-950" />
            </div>
          </Tooltip>
        );
      })}

      {remainingCount > 0 && (
        <Tooltip
          content={`${remainingCount} more viewer${remainingCount > 1 ? "s" : ""}`}
          position="bottom"
        >
          <div
            className="relative inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-slate-900 bg-slate-800 text-[10px] font-bold text-slate-300 shadow-sm transition-transform hover:z-10 hover:scale-110"
            data-testid="presence-avatar-overflow"
          >
            +{remainingCount}
          </div>
        </Tooltip>
      )}
    </div>
  );
}
