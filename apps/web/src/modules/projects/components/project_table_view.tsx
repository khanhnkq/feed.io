"use client";

import type { ProjectResponse } from "@feedio/api-client";
import {
  ArrowRight,
  Film,
  Globe,
  Lock,
  MoreVertical,
  Pencil,
  Trash2,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useRef, useState } from "react";

import {
  CardBadge,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
} from "@/modules/ui";
import { useOrganization } from "@/shared/providers/organization_context";

interface ProjectTableViewProps {
  projects: ProjectResponse[];
  onEdit?: (project: ProjectResponse) => void;
  onDelete?: (project: ProjectResponse) => void;
  onManageMembers?: (project: ProjectResponse) => void;
}

export function ProjectTableView({
  projects,
  onEdit,
  onDelete,
  onManageMembers,
}: ProjectTableViewProps) {
  const organization = useOrganization();
  const router = useRouter();

  const handleRowClick = (projectId: string) => {
    router.push(`/app/organizations/${organization.slug}/projects/${projectId}`);
  };

  return (
    <TableContainer>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-14">#</TableHead>
            <TableHead>Project</TableHead>
            <TableHead className="hidden sm:table-cell w-28">Access</TableHead>
            <TableHead className="hidden md:table-cell">Created</TableHead>
            <TableHead align="right" className="w-24">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {projects.map((project, index) => (
            <ProjectTableRow
              key={project.id}
              project={project}
              index={index}
              onNavigate={() => handleRowClick(project.id)}
              onEdit={onEdit}
              onDelete={onDelete}
              onManageMembers={onManageMembers}
            />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function ProjectTableRow({
  project,
  index,
  onNavigate,
  onEdit,
  onDelete,
  onManageMembers,
}: {
  project: ProjectResponse;
  index: number;
  onNavigate: () => void;
  onEdit?: (project: ProjectResponse) => void;
  onDelete?: (project: ProjectResponse) => void;
  onManageMembers?: (project: ProjectResponse) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isPrivate = project.visibility === "private";
  const createdAt = new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(project.created_at));

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
    <TableRow
      isClickable
      onClick={onNavigate}
      className="group cursor-pointer hover:bg-[#f5f6ee]/80"
    >
      <TableCell className="w-14 font-mono text-xs text-muted">
        <CardBadge className="text-[10px]">
          {String(index + 1).padStart(2, "0")}
        </CardBadge>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-lg border border-line bg-[#fbfbf7] text-ink shadow-[2px_2px_0_#d8ff43] transition-transform group-hover:scale-105">
            <Film size={16} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate font-bold text-ink group-hover:text-black">
                {project.name}
              </span>
              <ArrowRight
                size={13}
                className="opacity-0 transition-opacity group-hover:opacity-100 text-muted"
              />
            </div>
            {project.description && (
              <p className="truncate text-xs text-muted">
                {project.description}
              </p>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell className="hidden sm:table-cell">
        {isPrivate ? (
          <span className="inline-flex items-center gap-1 rounded-md border border-line bg-paper px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted">
            <Lock size={10} className="text-muted" />
            <span>Private</span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-md border border-line bg-paper px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted">
            <Globe size={10} className="text-muted" />
            <span>Public</span>
          </span>
        )}
      </TableCell>
      <TableCell className="hidden md:table-cell font-mono text-xs text-muted">
        {createdAt}
      </TableCell>
      <TableCell align="right" onClick={(e) => e.stopPropagation()}>
        {(onEdit || onDelete || onManageMembers) && (
          <div ref={menuRef} className="relative inline-block text-left">
            <button
              type="button"
              aria-label="Project options"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setMenuOpen((prev) => !prev);
              }}
              className="grid size-8 place-items-center rounded-lg text-muted transition hover:bg-paper hover:text-ink"
            >
              <MoreVertical size={16} />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-9 z-20 w-44 rounded-lg border border-line bg-surface py-1 text-left shadow-lg animate-in fade-in zoom-in-95 duration-100">
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
      </TableCell>
    </TableRow>
  );
}
