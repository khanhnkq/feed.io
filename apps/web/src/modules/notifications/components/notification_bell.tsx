"use client";

import { Bell } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { useUnreadNotificationCount } from "../hooks/use_notifications";
import { NotificationPopover } from "./notification_popover";

export interface NotificationBellProps {
  organizationId?: string | null;
  className?: string;
  variant?: "default" | "sidebar";
  placement?:
    | "bottom-right"
    | "bottom-left"
    | "top-right"
    | "top-left"
    | "right-bottom"
    | "right-top";
}

const PLACEMENT_CLASSES: Record<
  NonNullable<NotificationBellProps["placement"]>,
  string
> = {
  "bottom-right": "right-0 top-full mt-2 origin-top-right",
  "bottom-left": "left-0 top-full mt-2 origin-top-left",
  "top-right": "right-0 bottom-full mb-2 origin-bottom-right",
  "top-left": "left-0 bottom-full mb-2 origin-bottom-left",
  "right-bottom": "left-full bottom-0 ml-3 origin-bottom-left",
  "right-top": "left-full top-0 ml-3 origin-top-left",
};

export function NotificationBell({
  organizationId,
  className = "",
  variant = "default",
  placement = "bottom-right",
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

  const isSidebar = variant === "sidebar";
  const popoverPosition = PLACEMENT_CLASSES[placement] || PLACEMENT_CLASSES["bottom-right"];

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={`Notifications (${unreadCount} unread)`}
        aria-expanded={isOpen}
        className={
          isSidebar
            ? `relative grid size-8 shrink-0 place-items-center rounded-md border-0 bg-transparent transition ${
                isOpen
                  ? "bg-[#292c25] text-white"
                  : "text-[#8b8e83] hover:bg-[#292c25] hover:text-white"
              }`
            : `relative flex items-center justify-center size-9 rounded-xl border transition ${
                isOpen
                  ? "border-ink bg-paper text-ink"
                  : "border-line bg-surface hover:border-ink hover:bg-paper text-muted hover:text-ink"
              }`
        }
      >
        <Bell className={isSidebar ? "size-4" : "size-4.5"} />

        {/* Badge for Unread */}
        {unreadCount > 0 && (
          <span
            className={
              isSidebar
                ? "absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-[16px] px-1 text-[9px] font-extrabold text-ink bg-lime rounded-full border border-[#1d2019]"
                : "absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-extrabold text-ink bg-lime rounded-full border border-ink"
            }
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div
          className={`absolute z-50 shadow-2xl animate-in fade-in-0 zoom-in-95 ${popoverPosition}`}
        >
          <NotificationPopover
            organizationId={organizationId}
            onClose={() => setIsOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
