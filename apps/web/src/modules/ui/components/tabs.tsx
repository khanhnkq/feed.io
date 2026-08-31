"use client";

import React from "react";

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  size?: "sm" | "md";
  variant?: "pills" | "underlined";
  className?: string;
}

export function Tabs({
  items,
  activeId,
  onChange,
  size = "md",
  variant = "pills",
  className = "",
}: TabsProps) {
  const sizeClasses = {
    sm: "px-2.5 py-1 text-xs",
    md: "px-3 py-1.5 text-xs font-semibold",
  }[size];

  if (variant === "underlined") {
    return (
      <div className={`flex items-center gap-4 border-b border-line ${className}`}>
        {items.map((tab) => {
          const isActive = tab.id === activeId;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={`flex items-center gap-2 border-b-2 py-2.5 text-xs font-semibold transition ${
                isActive
                  ? "border-ink text-ink font-bold"
                  : "border-transparent text-muted hover:border-line hover:text-ink"
              }`}
            >
              {tab.icon && <span>{tab.icon}</span>}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono font-bold ${
                    isActive ? "bg-lime text-ink border border-ink/20" : "bg-surface text-muted"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      {items.map((tab) => {
        const isActive = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`inline-flex items-center gap-1.5 rounded-lg border transition-all ${sizeClasses} ${
              isActive
                ? "border-ink bg-lime text-ink font-bold shadow-[2px_2px_0_#11130f] active:scale-98"
                : "border-transparent bg-transparent text-muted hover:border-line hover:bg-surface hover:text-ink"
            }`}
          >
            {tab.icon && <span>{tab.icon}</span>}
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono font-bold ${
                  isActive
                    ? "bg-paper text-ink border border-ink/20"
                    : "bg-surface text-muted"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
