"use client";

import { Layers } from "lucide-react";
import React from "react";

import { FilterToolbar, type SortOptionItem, type ViewMode } from "@/modules/ui";

import type { SortOption } from "../lib/project_filter";

const FOLDER_SORT_OPTIONS: SortOptionItem<SortOption>[] = [
  { value: "name_asc", label: "Name (A → Z)" },
  { value: "name_desc", label: "Name (Z → A)" },
  { value: "created_desc", label: "Newest first" },
  { value: "created_asc", label: "Oldest first" },
];

interface FolderFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  count: number;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  sortOption: SortOption;
  onSortChange: (sort: SortOption) => void;
  borderTop?: boolean;
  className?: string;
  groupVersions?: boolean;
  onGroupVersionsChange?: (group: boolean) => void;
}

export function FolderFilterBar({
  search,
  onSearchChange,
  count,
  viewMode,
  onViewModeChange,
  sortOption,
  onSortChange,
  borderTop = false,
  className = "",
  groupVersions = true,
  onGroupVersionsChange,
}: FolderFilterBarProps) {
  return (
    <FilterToolbar
      search={search}
      onSearchChange={onSearchChange}
      searchPlaceholder="Search folders and media in this directory…"
      searchAriaLabel="Search folders and media"
      count={count}
      itemLabelSingular="item"
      itemLabelPlural="items"
      viewMode={viewMode}
      onViewModeChange={onViewModeChange}
      sortOption={sortOption}
      onSortChange={onSortChange}
      sortOptions={FOLDER_SORT_OPTIONS}
      sortAriaLabel="Sort items"
      borderTop={borderTop}
      className={className}
      extraControls={
        onGroupVersionsChange ? (
          <button
            type="button"
            onClick={() => onGroupVersionsChange(!groupVersions)}
            className={`flex min-h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-colors focus-visible:outline-3 focus-visible:outline-focus ${
              groupVersions
                ? "border-ink bg-ink text-white"
                : "border-line bg-surface text-muted hover:bg-paper hover:text-ink"
            }`}
            title={
              groupVersions
                ? "Gom nhóm phiên bản đang bật (Bấm để hiển thị tất cả file đơn lẻ)"
                : "Hiển thị tất cả file đơn lẻ (Bấm để gom nhóm phiên bản)"
            }
            aria-pressed={groupVersions}
          >
            <Layers size={13} />
            <span>{groupVersions ? "Gom nhóm (Stacks)" : "Tất cả file"}</span>
          </button>
        ) : undefined
      }
    />
  );
}
