"use client";

import type { BreadcrumbItemResponse, ProjectResponse } from "@feedio/api-client";
import {
  FolderPlus,
  Globe,
  Lock,
  MoreVertical,
  Pencil,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/modules/ui";
import { ProjectBreadcrumbs } from "./project_breadcrumbs";

interface ProjectPageHeaderProps {
  organizationSlug: string;
  project: ProjectResponse;
  breadcrumbs: BreadcrumbItemResponse[];
  onNavigateToRoot: () => void;
  onNavigateToFolder: (folderId: string) => void;
  onOpenMembers: () => void;
  onOpenCreateFolder: () => void;
  onOpenUploadMedia?: () => void;
  onOpenUploadVideo?: () => void;
  onOpenEditProject: () => void;
  onOpenDeleteProject: () => void;
}

export function ProjectPageHeader({
  organizationSlug,
  project,
  breadcrumbs,
  onNavigateToRoot,
  onNavigateToFolder,
  onOpenMembers,
  onOpenCreateFolder,
  onOpenUploadMedia,
  onOpenUploadVideo,
  onOpenEditProject,
  onOpenDeleteProject,
}: ProjectPageHeaderProps) {
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const projectMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (projectMenuRef.current && !projectMenuRef.current.contains(event.target as Node)) {
        setProjectMenuOpen(false);
      }
    }
    if (projectMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [projectMenuOpen]);

  const isPrivate = project.visibility === "private";

  return (
    <section className="flex flex-col gap-4 border-b border-line pb-6 md:flex-row md:items-center md:justify-between">
      <div>
        <ProjectBreadcrumbs
          organizationSlug={organizationSlug}
          projectId={project.id}
          projectName={project.name}
          breadcrumbs={breadcrumbs}
          onNavigateToRoot={onNavigateToRoot}
          onNavigateToFolder={onNavigateToFolder}
        />
        <div className="mt-3 flex items-center gap-3 flex-wrap">
          <h1 className="text-[28px] font-bold tracking-tight text-ink md:text-[34px]">
            {breadcrumbs.length > 0 ? breadcrumbs[breadcrumbs.length - 1].name : project.name}
          </h1>
          {isPrivate ? (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-line bg-paper px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-muted">
              <Lock size={12} className="text-muted" />
              <span>Private</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-line bg-paper px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-muted">
              <Globe size={12} className="text-muted" />
              <span>Public</span>
            </span>
          )}
        </div>
        {breadcrumbs.length === 0 && (
          <p className="mt-1 text-sm text-muted">
            {project.description || "Upload media assets and organize cuts for collaborative review."}
          </p>
        )}
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-2.5 flex-wrap">
        <Button variant="outline" size="sm" onClick={onOpenMembers}>
          <Users size={15} />
          Access
        </Button>

        <Button variant="outline" size="sm" onClick={onOpenCreateFolder}>
          <FolderPlus size={15} />
          New folder
        </Button>

        <Button
          variant="primary"
          size="sm"
          onClick={onOpenUploadMedia || onOpenUploadVideo}
        >
          <Upload size={15} />
          Upload media
        </Button>

        <div ref={projectMenuRef} className="relative">
          <button
            type="button"
            aria-label="Project options"
            onClick={() => setProjectMenuOpen((prev) => !prev)}
            className="grid size-8 place-items-center rounded-lg border border-line bg-surface text-muted transition hover:border-ink hover:text-ink"
          >
            <MoreVertical size={16} />
          </button>

          {projectMenuOpen && (
            <div className="absolute right-0 top-10 z-20 w-44 rounded-lg border border-line bg-surface py-1 shadow-lg">
              <button
                type="button"
                onClick={() => {
                  setProjectMenuOpen(false);
                  onOpenMembers();
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-ink hover:bg-paper"
              >
                <Users size={13} />
                Manage access
              </button>
              <button
                type="button"
                onClick={() => {
                  setProjectMenuOpen(false);
                  onOpenEditProject();
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-ink hover:bg-paper"
              >
                <Pencil size={13} />
                Edit project
              </button>
              <button
                type="button"
                onClick={() => {
                  setProjectMenuOpen(false);
                  onOpenDeleteProject();
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50"
              >
                <Trash2 size={13} />
                Delete project
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
