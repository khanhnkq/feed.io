"use client";

import {
  ArrowUpDown,
  Check,
  ChevronDown,
  LayoutGrid,
  List,
  Search,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

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
  leftControls?: React.ReactNode;
  extraControls?: React.ReactNode;
}

interface SortDropdownProps<T extends string = string> {
  sortOption: T;
  onSortChange: (sort: T) => void;
  sortOptions: SortOptionItem<T>[];
  sortAriaLabel?: string;
}

function SortDropdown<T extends string = string>({
  sortOption,
  onSortChange,
  sortOptions,
  sortAriaLabel = "Sort",
}: SortDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeOption = sortOptions.find((opt) => opt.value === sortOption);

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
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label={sortAriaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`flex min-h-9 h-9 items-center gap-2 rounded-lg border px-3 text-xs font-medium transition ${
          isOpen
            ? "border-ink bg-paper text-ink"
            : "border-line bg-surface text-ink hover:border-ink hover:bg-paper"
        }`}
      >
        <ArrowUpDown size={13} className="shrink-0 text-muted" />
        <span>{activeOption?.label || "Sort"}</span>
        <ChevronDown
          size={13}
          className={`shrink-0 text-muted transition-transform duration-150 ${
            isOpen ? "rotate-180 text-ink" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label={sortAriaLabel}
          className="absolute right-0 top-full mt-1.5 z-30 min-w-[190px] rounded-xl border border-line bg-surface p-1 shadow-xl animate-in fade-in-0 zoom-in-95 origin-top-right"
        >
          <div className="flex flex-col gap-0.5">
            {sortOptions.map((opt) => {
              const isSelected = opt.value === sortOption;
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onSortChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-left text-xs transition ${
                    isSelected
                      ? "bg-paper font-semibold text-ink"
                      : "text-muted hover:bg-paper/70 hover:text-ink"
                  }`}
                >
                  <span>{opt.label}</span>
                  {isSelected && (
                    <Check size={13} className="shrink-0 text-ink" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
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
  leftControls,
  extraControls,
}: FilterToolbarProps<T>) {
  return (
    <section
      className={`flex flex-col gap-4 ${borderTop ? "mt-10 border-t border-line pt-5" : ""} lg:flex-row lg:items-center lg:justify-between ${className}`}
      aria-label="Filter and layout controls"
    >
      {/* Search Input & Left Controls */}
      <div className="flex flex-1 flex-wrap items-center gap-3">
        {leftControls}
        {leftControls && <div className="hidden h-5 w-px bg-line sm:block" />}
        <label
          className={`group flex w-full items-center gap-2.5 text-muted focus-within:text-ink ${
            leftControls
              ? "sm:w-auto sm:min-w-[220px] lg:max-w-[320px]"
              : "lg:max-w-[360px]"
          }`}
        >
          <Search
            size={16}
            className="shrink-0 text-muted transition-colors group-focus-within:text-ink"
          />
          <input
            className="w-full border-0 bg-transparent py-2 text-sm text-ink outline-none placeholder:text-muted focus-visible:ring-0"
            aria-label={searchAriaLabel}
            placeholder={searchPlaceholder}
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </label>
      </div>

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
        {sortOption &&
          onSortChange &&
          sortOptions &&
          sortOptions.length > 0 && (
            <SortDropdown
              sortOption={sortOption}
              onSortChange={onSortChange}
              sortOptions={sortOptions}
              sortAriaLabel={sortAriaLabel}
            />
          )}

        {/* Extra controls (e.g. Group Stacks toggle) */}
        {extraControls}

        {/* View Mode Toggle */}
        {viewMode && onViewModeChange && (
          <span className="flex items-center" aria-label="Layout mode">
            <button
              className={`-mr-px flex min-h-9 items-center rounded-l-lg border px-2.5 transition-colors focus-visible:z-10 focus-visible:outline-3 focus-visible:outline-focus ${
                viewMode === "grid"
                  ? "border-ink bg-ink text-white"
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
                  ? "border-ink bg-ink text-white"
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
