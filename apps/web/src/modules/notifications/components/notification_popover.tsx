"use client";

import { Bell, CheckCheck, Loader2 } from "lucide-react";
import React, { useState } from "react";
import { Button } from "@/modules/ui/components/button";
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "../hooks/use_notifications";
import { NotificationItem } from "./notification_item";

export interface NotificationPopoverProps {
  organizationId?: string | null;
  onClose?: () => void;
}

export function NotificationPopover({
  organizationId,
  onClose,
}: NotificationPopoverProps) {
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const {
    data,
    isLoading,
  } = useNotifications({
    organizationId,
    unreadOnly: filter === "unread",
    limit: 40,
  });

  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();

  const notifications = data?.items || [];
  const totalUnread = data?.total_unread || 0;

  const handleMarkAllRead = () => {
    markAllReadMutation.mutate(organizationId);
  };

  return (
    <div className="w-[360px] sm:w-[400px] max-w-[90vw] flex flex-col rounded-xl border border-line bg-surface overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-line bg-paper/60">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-ink">Notifications</h3>
          {totalUnread > 0 && (
            <span className="flex items-center justify-center px-2 py-0.5 text-[11px] font-bold bg-lime text-ink rounded-full">
              {totalUnread} new
            </span>
          )}
        </div>

        {totalUnread > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={markAllReadMutation.isPending}
            className="text-xs text-muted hover:text-ink flex items-center gap-1.5 h-7 px-2"
          >
            <CheckCheck className="size-3.5" />
            <span>Mark all read</span>
          </Button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-line bg-paper/30">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`px-3 py-1 text-xs font-semibold rounded-lg transition ${
            filter === "all"
              ? "bg-ink text-surface"
              : "text-muted hover:text-ink hover:bg-paper"
          }`}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => setFilter("unread")}
          className={`px-3 py-1 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 ${
            filter === "unread"
              ? "bg-ink text-surface"
              : "text-muted hover:text-ink hover:bg-paper"
          }`}
        >
          <span>Unread</span>
          {totalUnread > 0 && (
            <span className="size-1.5 rounded-full bg-lime" />
          )}
        </button>
      </div>

      {/* Body: Notifications List */}
      <div className="flex-1 max-h-[380px] overflow-y-auto p-2 space-y-1 divide-y divide-line/40">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted gap-2">
            <Loader2 className="size-5 animate-spin text-muted" />
            <span className="text-xs">Loading notifications...</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted gap-2 text-center px-4">
            <div className="size-10 rounded-full bg-paper border border-line flex items-center justify-center text-muted">
              <Bell className="size-5" />
            </div>
            <p className="text-xs font-semibold text-ink">
              {filter === "unread" ? "No unread notifications" : "No notifications yet"}
            </p>
            <p className="text-[11px] text-muted max-w-[240px]">
              {filter === "unread"
                ? "You've read all your updates and mentions. You're all caught up!"
                : "Activity like comment mentions, replies, and review updates will appear here."}
            </p>
          </div>
        ) : (
          notifications.map((n) => (
            <div key={n.id} className="pt-1 first:pt-0">
              <NotificationItem
                notification={n}
                onMarkRead={(id) => markReadMutation.mutate(id)}
                onNavigate={onClose}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
