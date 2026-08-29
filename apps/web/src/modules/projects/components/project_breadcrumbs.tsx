"use client";

import type { BreadcrumbItemResponse } from "@feedio/api-client";
import { ChevronRight, Folder, Home } from "lucide-react";
import Link from "next/link";
import React from "react";

interface ProjectBreadcrumbsProps {
  organizationSlug: string;
  projectId?: string;
  projectName: string;
  breadcrumbs?: BreadcrumbItemResponse[];
  onNavigateToRoot: () => void;
  onNavigateToFolder: (folderId: string) => void;
}

export function ProjectBreadcrumbs({
  organizationSlug,
  projectName,
  breadcrumbs = [],
  onNavigateToRoot,
  onNavigateToFolder,
}: ProjectBreadcrumbsProps) {
  const isAtRoot = breadcrumbs.length === 0;

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex flex-wrap items-center gap-1.5 text-[13px] text-muted"
    >
      <Link
        href={`/app/organizations/${organizationSlug}/projects`}
        className="flex items-center gap-1 font-medium transition hover:text-ink"
      >
        <Home size={14} />
        <span>Projects</span>
      </Link>

      <ChevronRight size={13} className="text-muted/60" />

      {isAtRoot ? (
        <span className="font-semibold text-ink">{projectName}</span>
      ) : (
        <button
          type="button"
          onClick={onNavigateToRoot}
          className="font-medium transition hover:text-ink"
        >
          {projectName}
        </button>
      )}

      {breadcrumbs.map((item, index) => {
        const isLast = index === breadcrumbs.length - 1;
        return (
          <div key={item.id} className="flex items-center gap-1.5">
            <ChevronRight size={13} className="text-muted/60" />
            {isLast ? (
              <span className="flex items-center gap-1.5 font-semibold text-ink">
                <Folder size={13} className="text-muted" />
                {item.name}
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onNavigateToFolder(item.id)}
                className="flex items-center gap-1.5 font-medium transition hover:text-ink"
              >
                <Folder size={13} className="text-muted/60" />
                {item.name}
              </button>
            )}
          </div>
        );
      })}
    </nav>
  );
}
