"use client";

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
}: FolderFilterBarProps) {
  return (
    <FilterToolbar
      search={search}
      onSearchChange={onSearchChange}
      searchPlaceholder="Search folders in this directory…"
      searchAriaLabel="Search folders"
      count={count}
      itemLabelSingular="folder"
      itemLabelPlural="folders"
      viewMode={viewMode}
      onViewModeChange={onViewModeChange}
      sortOption={sortOption}
      onSortChange={onSortChange}
      sortOptions={FOLDER_SORT_OPTIONS}
      sortAriaLabel="Sort folders"
      borderTop={borderTop}
      className={className}
    />
  );
}

