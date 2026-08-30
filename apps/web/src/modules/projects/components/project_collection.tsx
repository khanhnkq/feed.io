"use client";

import type { ProjectResponse } from "@feedio/api-client";
import { AlertCircle, RotateCcw } from "lucide-react";

import { Button } from "@/modules/ui";
import { ProjectCard } from "./project_card";
import type { ViewMode } from "./project_filter_bar";
import { ProjectSkeleton } from "./project_skeleton";
import { ProjectTableView } from "./project_table_view";

interface ProjectCollectionProps {
  projects?: ProjectResponse[];
  isLoading: boolean;
  isError: boolean;
  hasSearch: boolean;
  viewMode: ViewMode;
  onEdit?: (project: ProjectResponse) => void;
  onDelete?: (project: ProjectResponse) => void;
  onManageMembers?: (project: ProjectResponse) => void;
  onRetry?: () => void;
}

export function ProjectCollection({
  projects,
  isLoading,
  isError,
  hasSearch,
  viewMode,
  onEdit,
  onDelete,
  onManageMembers,
  onRetry,
}: ProjectCollectionProps) {
  if (isLoading) return <ProjectSkeleton />;

  if (isError) {
    return (
      <div
        className="grid min-h-80 place-items-center content-center rounded-xl border border-dashed border-[#c7c9bf] bg-[#fff1eb] p-12 text-center text-[#a5441d]"
        role="alert"
      >
        <AlertCircle className="mx-auto mb-3 h-10 w-10 text-[#d9a896]" />
        <h2 className="my-2 text-xl font-bold text-[#62220c]">
          Could not load projects
        </h2>
        <p className="m-0 max-w-md text-sm text-[#873615]">
          There was an issue loading projects for this organization. Please check your connection or retry.
        </p>
        {onRetry && (
          <div className="mt-5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRetry}
              className="bg-white"
            >
              <RotateCcw size={14} />
              Try again
            </Button>
          </div>
        )}
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

  if (viewMode === "list") {
    return (
      <ProjectTableView
        projects={projects}
        onEdit={onEdit}
        onDelete={onDelete}
        onManageMembers={onManageMembers}
      />
    );
  }

  return (
    <section
      className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
      aria-label="Projects"
    >
      {projects.map((project, index) => (
        <ProjectCard
          key={project.id}
          project={project}
          index={index}
          viewMode="grid"
          onEdit={onEdit}
          onDelete={onDelete}
          onManageMembers={onManageMembers}
        />
      ))}
    </section>
  );
}
