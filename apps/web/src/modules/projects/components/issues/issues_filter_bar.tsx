"use client";

import { Check, ChevronDown, Film } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { FilterToolbar, type SortOptionItem, Tabs } from "@/modules/ui";

export type IssueStatusFilter = "all" | "open" | "resolved";
export type IssueSortOption = "newest" | "oldest" | "timecode";

export const ISSUE_SORT_OPTIONS: SortOptionItem<IssueSortOption>[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "timecode", label: "Timestamp (start → end)" },
];

export interface MediaOption {
  id: string;
  title: string;
}

interface IssuesFilterBarProps {
  search: string;
  onSearchChange: (val: string) => void;
  statusFilter: IssueStatusFilter;
  onStatusFilterChange: (val: IssueStatusFilter) => void;
  mediaList: MediaOption[];
  selectedMediaId: string | null;
  onMediaSelect: (mediaId: string | null) => void;
  count: number;
  totalCount: number;
  openCount: number;
  resolvedCount: number;
  sortOption?: IssueSortOption;
  onSortChange?: (sort: IssueSortOption) => void;
  borderTop?: boolean;
}

export function IssuesFilterBar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  mediaList,
  selectedMediaId,
  onMediaSelect,
  count,
  totalCount,
  openCount,
  resolvedCount,
  sortOption = "newest",
  onSortChange,
  borderTop = false,
}: IssuesFilterBarProps) {
  const statusTabItems = [
    { id: "all", label: `All (${totalCount})` },
    { id: "open", label: `Open (${openCount})` },
    { id: "resolved", label: `Resolved (${resolvedCount})` },
  ];

  return (
    <div className="space-y-4">
      {/* Top row: Status Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          items={statusTabItems}
          activeId={statusFilter}
          onChange={(id) => onStatusFilterChange(id as IssueStatusFilter)}
          size="sm"
        />
      </div>

      {/* Shared FilterToolbar */}
      <FilterToolbar<IssueSortOption>
        search={search}
        onSearchChange={onSearchChange}
        searchPlaceholder="Search feedback comments…"
        searchAriaLabel="Search feedback"
        count={count}
        itemLabelSingular="issue"
        itemLabelPlural="issues"
        sortOption={sortOption}
        onSortChange={onSortChange}
        sortOptions={ISSUE_SORT_OPTIONS}
        sortAriaLabel="Sort issues"
        borderTop={borderTop}
        extraControls={
          <MediaFilterDropdown
            mediaList={mediaList}
            selectedMediaId={selectedMediaId}
            onMediaSelect={onMediaSelect}
          />
        }
      />
    </div>
  );
}

function MediaFilterDropdown({
  mediaList,
  selectedMediaId,
  onMediaSelect,
}: {
  mediaList: MediaOption[];
  selectedMediaId: string | null;
  onMediaSelect: (mediaId: string | null) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedMediaTitle = selectedMediaId
    ? mediaList.find((m) => m.id === selectedMediaId)?.title || "Selected Media"
    : "All Media";

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
        aria-label="Filter by media"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`flex min-h-9 items-center gap-2 rounded-lg border px-3 text-xs font-medium transition ${
          isOpen || selectedMediaId
            ? "border-ink bg-paper text-ink"
            : "border-line bg-surface text-ink hover:border-ink hover:bg-paper"
        }`}
      >
        <Film size={13} className="shrink-0 text-muted" />
        <span className="max-w-[130px] truncate">{selectedMediaTitle}</span>
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
          aria-label="Select media asset"
          className="absolute right-0 top-full mt-1.5 z-30 min-w-[200px] max-w-[260px] rounded-xl border border-line bg-surface p-1 shadow-xl animate-in fade-in-0 zoom-in-95 origin-top-right"
        >
          <div className="py-1 max-h-56 overflow-y-auto flex flex-col gap-0.5">
            <button
              type="button"
              role="option"
              aria-selected={!selectedMediaId}
              onClick={() => {
                onMediaSelect(null);
                setIsOpen(false);
              }}
              className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition ${
                !selectedMediaId
                  ? "bg-paper font-semibold text-ink"
                  : "text-muted hover:bg-paper/70 hover:text-ink"
              }`}
            >
              <span>All Media ({mediaList.length})</span>
              {!selectedMediaId && (
                <Check size={13} className="shrink-0 text-ink" />
              )}
            </button>
            {mediaList.map((m) => {
              const isSelected = m.id === selectedMediaId;
              return (
                <button
                  key={m.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onMediaSelect(m.id);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs transition ${
                    isSelected
                      ? "bg-paper font-semibold text-ink"
                      : "text-muted hover:bg-paper/70 hover:text-ink"
                  }`}
                >
                  <span className="truncate">{m.title}</span>
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
