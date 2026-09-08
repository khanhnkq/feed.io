"use client";

import Link from "next/link";
import React from "react";
import { formatRelativeTime, getNotificationTypeMeta } from "../lib/notification_utils";
import type { NotificationRecord } from "../types";

export interface NotificationItemProps {
  notification: NotificationRecord;
  onMarkRead?: (id: string) => void;
  onNavigate?: () => void;
}

export function NotificationItem({
  notification,
  onMarkRead,
  onNavigate,
}: NotificationItemProps) {
  const meta = getNotificationTypeMeta(notification.type);
  const Icon = meta.icon;

  const handleClick = () => {
    if (!notification.is_read && onMarkRead) {
      onMarkRead(notification.id);
    }
    onNavigate?.();
  };

  return (
    <Link
      href={notification.link_url || "#"}
      onClick={handleClick}
      className={`group relative flex items-start gap-3 p-3 rounded-lg border transition ${
        notification.is_read
          ? "border-transparent bg-transparent hover:bg-paper/50 hover:border-line/60 opacity-75 hover:opacity-100"
          : "border-line bg-paper/60 hover:border-ink/70 hover:bg-paper"
      }`}
    >
      {/* Icon Badge */}
      <div
        className={`shrink-0 flex items-center justify-center size-8 rounded-lg border ${meta.bgClass} ${meta.textClass}`}
      >
        <Icon className="size-4" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className="text-xs font-semibold text-ink truncate">
            {notification.title}
          </span>
          <span className="text-[11px] text-muted shrink-0">
            {formatRelativeTime(notification.created_at)}
          </span>
        </div>

        <p className="text-xs text-muted line-clamp-2 leading-relaxed break-words">
          {notification.message}
        </p>
      </div>

      {/* Unread Indicator */}
      {!notification.is_read && (
        <span
          className="shrink-0 size-2 rounded-full bg-lime border border-ink mt-1.5"
          title="Unread"
        />
      )}
    </Link>
  );
}
