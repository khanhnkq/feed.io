"use client";

import { FilterToolbar, type SortOptionItem, type ViewMode } from "@/modules/ui";

import type { SortOption } from "../lib/project_filter";

export type { ViewMode };

const PROJECT_SORT_OPTIONS: SortOptionItem<SortOption>[] = [
  { value: "created_desc", label: "Newest first" },
  { value: "created_asc", label: "Oldest first" },
  { value: "name_asc", label: "Name (A → Z)" },
  { value: "name_desc", label: "Name (Z → A)" },
];

interface ProjectFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  count: number;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  sortOption: SortOption;
  onSortChange: (sort: SortOption) => void;
}

export function ProjectFilterBar({
  search,
  onSearchChange,
  count,
  viewMode,
  onViewModeChange,
  sortOption,
  onSortChange,
}: ProjectFilterBarProps) {
  return (
    <FilterToolbar
      search={search}
      onSearchChange={onSearchChange}
      searchPlaceholder="Search by name or description"
      searchAriaLabel="Search projects"
      count={count}
      itemLabelSingular="project"
      itemLabelPlural="projects"
      viewMode={viewMode}
      onViewModeChange={onViewModeChange}
      sortOption={sortOption}
      onSortChange={onSortChange}
      sortOptions={PROJECT_SORT_OPTIONS}
      sortAriaLabel="Sort projects"
      borderTop={true}
    />
  );
}

