"use client";

import type { ProjectResponse } from "@feedio/api-client";
import {
  ArrowRight,
  Globe,
  Lock,
  MoreVertical,
  Pencil,
  Trash2,
  Users,
} from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

import {
  Card,
  CardBadge,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/modules/ui";
import { useOrganization } from "@/shared/providers/organization_context";

interface ProjectCardProps {
  project: ProjectResponse;
  index: number;
  viewMode?: "grid" | "list";
  onEdit?: (project: ProjectResponse) => void;
  onDelete?: (project: ProjectResponse) => void;
  onManageMembers?: (project: ProjectResponse) => void;
}

export function ProjectCard({
  project,
  index,
  viewMode = "grid",
  onEdit,
  onDelete,
  onManageMembers,
}: ProjectCardProps) {
  const organization = useOrganization();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const createdAt = new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(project.created_at));
  const isList = viewMode === "list";
  const isPrivate = project.visibility === "private";
  const projectHref = `/app/organizations/${organization.slug}/projects/${project.id}`;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuOpen]);

  return (
    <Card
      href={projectHref}
      className={isList ? "sm:flex-row sm:items-center sm:gap-6" : ""}
    >
      <CardContent className={isList ? "flex-1" : ""}>
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <CardBadge>{String(index + 1).padStart(2, "0")}</CardBadge>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
              {createdAt}
            </span>
          </div>

          {(onEdit || onDelete || onManageMembers) && (
            <div
              ref={menuRef}
              className="relative shrink-0"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <button
                type="button"
                aria-label="Project options"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setMenuOpen((prev) => !prev);
                }}
                className="grid size-7 place-items-center rounded-md text-muted transition hover:bg-paper hover:text-ink"
              >
                <MoreVertical size={15} />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-8 z-20 w-44 rounded-lg border border-line bg-surface py-1 shadow-lg animate-in fade-in zoom-in-95 duration-100">
                  {onManageMembers && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setMenuOpen(false);
                        onManageMembers(project);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-ink transition hover:bg-[#f3f4ee]"
                    >
                      <Users size={13} />
                      Manage access
                    </button>
                  )}
                  {onEdit && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setMenuOpen(false);
                        onEdit(project);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-ink transition hover:bg-[#f3f4ee]"
                    >
                      <Pencil size={13} />
                      Edit project
                    </button>
                  )}
                  {onDelete && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setMenuOpen(false);
                        onDelete(project);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50"
                    >
                      <Trash2 size={13} />
                      Delete project
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </CardHeader>

        <div className="mt-6 flex items-center justify-between gap-3">
          <CardTitle className="mt-0 truncate">{project.name}</CardTitle>
          {isPrivate ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-line bg-paper px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted">
              <Lock size={10} className="text-muted" />
              <span>Private</span>
            </span>
          ) : (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-md border border-line bg-paper px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted">
              <Globe size={10} className="text-muted" />
              <span>Public</span>
            </span>
          )}
        </div>

        <CardDescription className="line-clamp-2">
          {project.description ||
            "Upload video cuts and assets for collaborative review."}
        </CardDescription>
      </CardContent>
      <CardFooter
        bordered={!isList}
        className={isList ? "sm:mt-0 sm:border-t-0 sm:pt-0" : ""}
      >
        <span>Open project</span>
        <ArrowRight size={16} className="transition group-hover:translate-x-1" />
      </CardFooter>
    </Card>
  );
}
