"use client";

import type { MediaResponse } from "@feedio/api-client";
import React from "react";
import {
  Badge,
  type BadgeVariant,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
} from "../../../ui";

export interface CompareVersionDropdownProps {
  label: "A" | "B";
  variant?: BadgeVariant;
  selectedMedia: MediaResponse;
  versions: MediaResponse[];
  onSelect: (media: MediaResponse) => void;
}

export function CompareVersionDropdown({
  label,
  variant = label === "A" ? "lime" : "surface",
  selectedMedia,
  versions,
  onSelect,
}: CompareVersionDropdownProps) {
  return (
    <Dropdown size="sm" variant="outline">
      <DropdownTrigger className="gap-2">
        <Badge
          variant={variant}
          size="sm"
          className="font-mono font-bold uppercase"
        >
          {label}
        </Badge>
        <span className="font-mono text-xs font-bold text-ink">
          V{selectedMedia.version_number ?? 1}
        </span>
        <span className="truncate max-w-[120px] text-xs font-medium text-ink hidden md:inline">
          {selectedMedia.title}
        </span>
      </DropdownTrigger>
      <DropdownMenu
        align="right"
        className="min-w-[240px] max-h-60 overflow-y-auto"
      >
        {versions.map((v) => {
          const isSelected = v.id === selectedMedia.id;
          return (
            <DropdownItem
              key={v.id}
              isSelected={isSelected}
              onClick={() => onSelect(v)}
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-paper border border-line text-muted">
                  V{v.version_number ?? 1}
                </span>
                <span className="truncate max-w-[150px] font-medium">
                  {v.title}
                </span>
                {v.version_label && (
                  <span className="text-[10px] text-muted">
                    ({v.version_label})
                  </span>
                )}
              </div>
            </DropdownItem>
          );
        })}
      </DropdownMenu>
    </Dropdown>
  );
}
