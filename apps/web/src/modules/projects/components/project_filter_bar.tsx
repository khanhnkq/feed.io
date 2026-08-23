"use client";

import { LayoutGrid, List, Search } from "lucide-react";

export type ViewMode = "grid" | "list";

interface ProjectFilterBarProps {
  search: string;
  onSearchChange: (value: string) => void;
  count: number;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function ProjectFilterBar({
  search,
  onSearchChange,
  count,
  viewMode,
  onViewModeChange,
}: ProjectFilterBarProps) {
  return (
    <section
      className="mt-10 flex flex-col gap-[18px] border-t border-line pt-5 md:flex-row md:items-center md:justify-between"
      aria-label="Project filters"
    >
      <label className="flex w-full items-center gap-2.5 text-[#999c92] md:max-w-[360px]">
        <Search size={17} />
        <input
          className="w-full border-0 bg-transparent py-2 text-ink outline-none placeholder:text-[#999c92] focus-visible:ring-0"
          aria-label="Search projects"
          placeholder="Search by name or description"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </label>
      <div className="flex items-center justify-between gap-3 md:justify-start">
        <span
          className="font-mono text-[10px] font-bold uppercase tracking-[.06em] text-muted"
          aria-live="polite"
        >
          {count} {count === 1 ? "project" : "projects"}
        </span>
        <span className="flex items-center" aria-label="Project layout">
          <button
            className={`-mr-px flex min-h-11 items-center rounded-l-lg border border-line px-3 transition-colors focus-visible:z-10 focus-visible:outline-3 focus-visible:outline-focus ${viewMode === "grid" ? "bg-ink text-white" : "bg-surface text-muted"}`}
            type="button"
            aria-label="Grid view"
            aria-pressed={viewMode === "grid"}
            onClick={() => onViewModeChange("grid")}
          >
            <LayoutGrid size={16} />
          </button>
          <button
            className={`flex min-h-11 items-center rounded-r-lg border border-line px-3 transition-colors focus-visible:z-10 focus-visible:outline-3 focus-visible:outline-focus ${viewMode === "list" ? "bg-ink text-white" : "bg-surface text-muted"}`}
            type="button"
            aria-label="List view"
            aria-pressed={viewMode === "list"}
            onClick={() => onViewModeChange("list")}
          >
            <List size={16} />
          </button>
        </span>
      </div>
    </section>
  );
}
