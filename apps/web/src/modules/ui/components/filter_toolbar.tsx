"use client";

import { ArrowUpDown, LayoutGrid, List, Search } from "lucide-react";
import React from "react";

export type ViewMode = "grid" | "list";

export interface SortOptionItem<T extends string = string> {
  value: T;
  label: string;
}

export interface FilterToolbarProps<T extends string = string> {
  search: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  searchAriaLabel?: string;
  count: number;
  itemLabelSingular?: string;
  itemLabelPlural?: string;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  sortOption?: T;
  onSortChange?: (sort: T) => void;
  sortOptions?: SortOptionItem<T>[];
  sortAriaLabel?: string;
  className?: string;
  borderTop?: boolean;
}

export function FilterToolbar<T extends string = string>({
  search,
  onSearchChange,
  searchPlaceholder = "Search…",
  searchAriaLabel = "Search",
  count,
  itemLabelSingular = "item",
  itemLabelPlural = "items",
  viewMode,
  onViewModeChange,
  sortOption,
  onSortChange,
  sortOptions,
  sortAriaLabel = "Sort",
  className = "",
  borderTop = true,
}: FilterToolbarProps<T>) {
  return (
    <section
      className={`flex flex-col gap-4 ${borderTop ? "mt-10 border-t border-line pt-5" : ""} lg:flex-row lg:items-center lg:justify-between ${className}`}
      aria-label="Filter and layout controls"
    >
      {/* Search Input */}
      <label className="group flex w-full items-center gap-2.5 text-muted focus-within:text-ink lg:max-w-[360px]">
        <Search size={16} className="shrink-0 text-muted transition-colors group-focus-within:text-ink" />
        <input
          className="w-full border-0 bg-transparent py-2 text-sm text-ink outline-none placeholder:text-muted focus-visible:ring-0"
          aria-label={searchAriaLabel}
          placeholder={searchPlaceholder}
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </label>

      {/* Right Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 lg:justify-end">
        {/* Count */}
        <span
          className="font-mono text-[10px] font-bold uppercase tracking-[.06em] text-muted"
          aria-live="polite"
        >
          {count} {count === 1 ? itemLabelSingular : itemLabelPlural}
        </span>

        {/* Sort Selector */}
        {sortOption && onSortChange && sortOptions && sortOptions.length > 0 && (
          <div className="flex items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs text-ink transition focus-within:border-ink">
            <ArrowUpDown size={13} className="text-muted" />
            <select
              aria-label={sortAriaLabel}
              value={sortOption}
              onChange={(e) => onSortChange(e.target.value as T)}
              className="cursor-pointer bg-transparent font-medium outline-none text-xs text-ink"
            >
              {sortOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* View Mode Toggle */}
        {viewMode && onViewModeChange && (
          <span className="flex items-center" aria-label="Layout mode">
            <button
              className={`-mr-px flex min-h-9 items-center rounded-l-lg border px-2.5 transition-colors focus-visible:z-10 focus-visible:outline-3 focus-visible:outline-focus ${
                viewMode === "grid"
                  ? "border-ink bg-ink text-lime"
                  : "border-line bg-surface text-muted hover:bg-paper hover:text-ink"
              }`}
              type="button"
              aria-label="Grid view"
              aria-pressed={viewMode === "grid"}
              onClick={() => onViewModeChange("grid")}
            >
              <LayoutGrid size={15} />
            </button>
            <button
              className={`flex min-h-9 items-center rounded-r-lg border px-2.5 transition-colors focus-visible:z-10 focus-visible:outline-3 focus-visible:outline-focus ${
                viewMode === "list"
                  ? "border-ink bg-ink text-lime"
                  : "border-line bg-surface text-muted hover:bg-paper hover:text-ink"
              }`}
              type="button"
              aria-label="List view"
              aria-pressed={viewMode === "list"}
              onClick={() => onViewModeChange("list")}
            >
              <List size={15} />
            </button>
          </span>
        )}
      </div>
    </section>
  );
}
