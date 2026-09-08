"use client";

import { Bell } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { useUnreadNotificationCount } from "../hooks/use_notifications";
import { NotificationPopover } from "./notification_popover";

export interface NotificationBellProps {
  organizationId?: string | null;
  className?: string;
}

export function NotificationBell({
  organizationId,
  className = "",
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: unreadCount = 0 } = useUnreadNotificationCount({
    organizationId,
  });

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={`Notifications (${unreadCount} unread)`}
        aria-expanded={isOpen}
        className={`relative flex items-center justify-center size-9 rounded-xl border transition ${
          isOpen
            ? "border-ink bg-paper text-ink"
            : "border-line bg-surface hover:border-ink hover:bg-paper text-muted hover:text-ink"
        }`}
      >
        <Bell className="size-4.5" />

        {/* Badge for Unread */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-extrabold text-ink bg-lime rounded-full border border-ink">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 z-50 animate-in fade-in-0 zoom-in-95 origin-top-right">
          <NotificationPopover
            organizationId={organizationId}
            onClose={() => setIsOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
