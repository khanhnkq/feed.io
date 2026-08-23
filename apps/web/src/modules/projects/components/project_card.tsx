"use client";

import type { ProjectResponse } from "@feedio/api-client";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { useOrganization } from "@/shared/providers/organization_context";

interface ProjectCardProps {
  project: ProjectResponse;
  index: number;
  viewMode?: "grid" | "list";
}

export function ProjectCard({ project, index, viewMode = "grid" }: ProjectCardProps) {
  const organization = useOrganization();
  const createdAt = new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(project.created_at));
  const isList = viewMode === "list";
  const projectHref = `/app/organizations/${organization.slug}/projects/${project.id}`;

  return (
    <Link
      href={projectHref}
      className={`group flex flex-col justify-between rounded-xl border border-line bg-surface p-6 transition hover:-translate-y-1 hover:border-ink hover:shadow-[5px_5px_0_#d8ff43] focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-focus ${isList ? "sm:flex-row sm:items-center sm:gap-6" : ""}`}
    >
      <div className={isList ? "flex-1" : ""}>
        <div className="flex items-center justify-between">
          <span className="grid size-10 place-items-center rounded-lg bg-lime font-mono text-xs font-bold text-ink">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
            {createdAt}
          </span>
        </div>
        <h2 className="mt-6 text-xl font-bold tracking-tight text-ink group-hover:text-black">
          {project.name}
        </h2>
        <p className="mt-2 text-xs text-muted leading-relaxed line-clamp-2">
          {project.description || "Upload video cuts and assets for collaborative review."}
        </p>
      </div>
      <footer
        className={`flex items-center justify-between text-xs font-bold text-ink ${isList ? "sm:mt-0 sm:border-t-0 sm:pt-0" : "mt-8 border-t border-line pt-4"}`}
      >
        <span>Open project</span>
        <ArrowRight size={16} className="transition group-hover:translate-x-1" />
      </footer>
    </Link>
  );
}
