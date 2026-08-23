"use client";

import type { ProjectResponse } from "@feedio/api-client";

import { ProjectCard } from "./project_card";
import type { ViewMode } from "./project_filter_bar";
import { ProjectSkeleton } from "./project_skeleton";

interface ProjectCollectionProps {
  projects?: ProjectResponse[];
  isLoading: boolean;
  isError: boolean;
  hasSearch: boolean;
  viewMode: ViewMode;
}

export function ProjectCollection({
  projects,
  isLoading,
  isError,
  hasSearch,
  viewMode,
}: ProjectCollectionProps) {
  if (isLoading) return <ProjectSkeleton />;

  if (isError) {
    return (
      <div
        className="grid min-h-80 place-items-center content-center rounded-xl border border-dashed border-[#c7c9bf] bg-[#fff1eb] p-12 text-center text-[#a5441d]"
        role="alert"
      >
        <span className="font-mono text-[66px] font-bold leading-[.9] tracking-[-.08em] text-[#d9a896]">
          403
        </span>
        <h2 className="my-2 text-xl font-bold text-[#62220c]">
          Organization access is not ready
        </h2>
        <p className="m-0">We could not load your organization projects. Retry or sign in again.</p>
      </div>
    );
  }

  if (!projects?.length) {
    return (
      <div className="grid min-h-80 place-items-center content-center rounded-xl border border-dashed border-[#c7c9bf] p-12 text-center text-muted">
        <span className="font-mono text-[66px] font-bold leading-[.9] tracking-[-.08em] text-[#c5c7bd]">
          00
        </span>
        <h2 className="my-2 text-xl font-bold text-ink">
          {hasSearch ? "No matching projects" : "No projects yet"}
        </h2>
        <p className="m-0">
          {hasSearch
            ? "Try a different search term."
            : "Create the first review room for your organization."}
        </p>
      </div>
    );
  }

  const layoutClass =
    viewMode === "list"
      ? "grid grid-cols-1 gap-4"
      : "grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <section className={layoutClass} aria-label="Projects">
      {projects.map((project, index) => (
        <ProjectCard key={project.id} project={project} index={index} viewMode={viewMode} />
      ))}
    </section>
  );
}
