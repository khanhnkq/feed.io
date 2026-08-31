"use client";

import { ChevronDown, ChevronUp, X } from "lucide-react";
import React from "react";

export type FloatingPopupPosition =
  | "bottom-right"
  | "bottom-left"
  | "top-right"
  | "top-left";

export interface FloatingPopupContainerProps
  extends React.HTMLAttributes<HTMLDivElement> {
  position?: FloatingPopupPosition;
  children: React.ReactNode;
}

export const floatingPopupPositionClasses: Record<FloatingPopupPosition, string> = {
  "bottom-right": "bottom-6 right-6",
  "bottom-left": "bottom-6 left-6",
  "top-right": "top-6 right-6",
  "top-left": "top-6 left-6",
};

export function getFloatingPopupPositionClassName(
  position: FloatingPopupPosition = "bottom-right",
): string {
  return floatingPopupPositionClasses[position] || floatingPopupPositionClasses["bottom-right"];
}

export function FloatingPopupContainer({
  position = "bottom-right",
  children,
  className = "",
  ...props
}: FloatingPopupContainerProps) {
  return (
    <aside
      aria-label="Notifications and status"
      className={`fixed z-50 flex w-96 max-w-[calc(100vw-3rem)] flex-col gap-4 transition-all duration-200 animate-in slide-in-from-bottom-4 ${getFloatingPopupPositionClassName(
        position,
      )} ${className}`}
      {...props}
    >
      {children}
    </aside>
  );
}

export type FloatingPopupVariant = "surface" | "success" | "dark" | "error";

export interface FloatingPopupProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  variant?: FloatingPopupVariant;
  icon?: React.ReactNode;
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  progress?: number | "indeterminate";
  actions?: React.ReactNode;
  footer?: React.ReactNode;
  onClose?: () => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  expandableContent?: React.ReactNode;
}

export const floatingPopupVariantClasses: Record<FloatingPopupVariant, string> = {
  surface:
    "border-line bg-surface text-ink hover:-translate-y-1 hover:border-ink hover:shadow-[5px_5px_0_#d8ff43]",
  success:
    "border-line bg-surface text-ink hover:-translate-y-1 hover:border-ink hover:shadow-[5px_5px_0_#d8ff43]",
  dark:
    "border-ink bg-ink text-white hover:-translate-y-1 hover:border-lime hover:shadow-[5px_5px_0_#d8ff43]",
  error:
    "border-red-300 bg-surface text-ink hover:-translate-y-1 hover:border-red-500 hover:shadow-[5px_5px_0_#dc2626]",
};

export function getFloatingPopupVariantClassName(
  variant: FloatingPopupVariant = "surface",
): string {
  return floatingPopupVariantClasses[variant] || floatingPopupVariantClasses.surface;
}

export function FloatingPopup({
  variant = "surface",
  icon,
  eyebrow,
  title,
  description,
  progress,
  actions,
  footer,
  onClose,
  isExpanded,
  onToggleExpand,
  expandableContent,
  className = "",
  ...props
}: FloatingPopupProps) {
  const isDark = variant === "dark";

  return (
    <div
      role="status"
      className={`group flex flex-col justify-between rounded-xl border p-6 transition duration-200 ${getFloatingPopupVariantClassName(
        variant,
      )} ${className}`}
      {...props}
    >
      {/* Top Header Row (Badge + Controls/Actions) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {icon}
          {eyebrow && (
            <span
              className={`font-mono text-xs font-bold uppercase ${
                isDark ? "text-white/60" : "text-muted"
              }`}
            >
              {eyebrow}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {actions}
          {onToggleExpand && (
            <button
              type="button"
              onClick={onToggleExpand}
              aria-label={isExpanded ? "Collapse details" : "Expand details"}
              className={`grid size-7 place-items-center rounded-lg transition ${
                isDark
                  ? "text-white/60 hover:text-white"
                  : "text-muted hover:text-ink"
              }`}
            >
              {isExpanded ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Dismiss notification"
              className={`grid size-7 place-items-center rounded-lg transition ${
                isDark
                  ? "text-white/60 hover:text-white"
                  : "text-muted hover:text-ink"
              }`}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Main Title & Description (Card Layout) */}
      <div className="mt-4">
        <h3
          className={`text-base font-bold tracking-tight ${
            isDark ? "text-white" : "text-ink group-hover:text-black"
          }`}
        >
          {title}
        </h3>
        {description && (
          <p
            className={`mt-1.5 text-xs leading-relaxed ${
              isDark ? "text-white/70" : "text-muted"
            }`}
          >
            {description}
          </p>
        )}
      </div>

      {/* Progress Bar */}
      {progress !== undefined && (
        <div className="mt-4">
          <div
            className={`h-1.5 w-full overflow-hidden rounded-full border ${
              isDark ? "border-white/20 bg-white/10" : "border-line bg-paper"
            }`}
          >
            {typeof progress === "number" ? (
              <div
                className={`h-full transition-all duration-300 rounded-full ${
                  isDark ? "bg-lime" : "bg-ink"
                }`}
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            ) : (
              <div
                className={`h-full w-2/5 rounded-full transition-all duration-300 ${
                  isDark ? "bg-lime" : "bg-lime border-r border-ink/30"
                }`}
              />
            )}
          </div>
        </div>
      )}

      {/* Expandable Section */}
      {isExpanded && expandableContent && (
        <div
          className={`mt-4 space-y-1.5 border-t pt-3 ${
            isDark ? "border-white/10" : "border-line"
          }`}
        >
          {expandableContent}
        </div>
      )}

      {/* Card-Style Footer */}
      {footer && (
        <footer
          className={`mt-6 flex items-center justify-between border-t pt-4 text-xs font-bold font-mono ${
            isDark
              ? "border-white/10 text-white/70"
              : "border-line text-muted"
          }`}
        >
          {footer}
        </footer>
      )}
    </div>
  );
}
