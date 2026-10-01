"use client";

import type { OrganizationResponse } from "@feedio/api-client";
import { ArrowRight, Building2, MoreVertical, Pencil, Trash2 } from "lucide-react";
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

interface OrganizationTableViewProps {
  organizations: OrganizationResponse[];
  onEdit?: (org: OrganizationResponse) => void;
  onDelete?: (org: OrganizationResponse) => void;
}

export function OrganizationTableView({
  organizations,
  onEdit,
  onDelete,
}: OrganizationTableViewProps) {
  const router = useRouter();

  const handleRowClick = (slug: string) => {
    router.push(`/app/organizations/${slug}`);
  };

  return (
    <TableContainer>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-14">#</TableHead>
            <TableHead>Organization</TableHead>
            <TableHead className="w-28">Role</TableHead>
            <TableHead className="hidden md:table-cell">Slug</TableHead>
            <TableHead align="right" className="w-24">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {organizations.map((org, index) => (
            <OrganizationTableRow
              key={org.id}
              organization={org}
              index={index}
              onNavigate={() => handleRowClick(org.slug)}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function OrganizationTableRow({
  organization,
  index,
  onNavigate,
  onEdit,
  onDelete,
}: {
  organization: OrganizationResponse;
  index: number;
  onNavigate: () => void;
  onEdit?: (org: OrganizationResponse) => void;
  onDelete?: (org: OrganizationResponse) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
            <Building2 size={16} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="truncate font-bold text-ink group-hover:text-black">
                {organization.name}
              </span>
              {organization.plan_tier && organization.plan_tier !== "free" && (
                <span className="inline-flex items-center rounded-full bg-[#161813] px-2 py-0.5 text-[9px] font-bold text-lime uppercase tracking-wider">
                  PRO
                </span>
              )}
              <ArrowRight
                size={13}
                className="opacity-0 transition-opacity group-hover:opacity-100 text-muted"
              />
            </div>
            <p className="truncate text-xs text-muted md:hidden font-mono">
              {organization.slug}
            </p>
          </div>
        </div>
      </TableCell>
      <TableCell className="w-28">
        {organization.role === "owner" ? (
          <span className="inline-flex items-center rounded-full bg-lime/25 px-2 py-0.5 text-[9px] font-bold text-ink border border-lime/40 uppercase tracking-wider">
            Owner
          </span>
        ) : organization.role === "admin" ? (
          <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2 py-0.5 text-[9px] font-bold text-blue-700 border border-blue-500/30 uppercase tracking-wider">
            Admin
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-[#f0f1ea] px-2 py-0.5 text-[9px] font-medium text-muted border border-line uppercase tracking-wider">
            Member
          </span>
        )}
      </TableCell>
      <TableCell className="hidden md:table-cell font-mono text-xs text-muted">
        {organization.slug}
      </TableCell>
      <TableCell align="right" onClick={(e) => e.stopPropagation()}>
        {(onEdit || (onDelete && organization.role === "owner")) && (
          <div ref={menuRef} className="relative inline-block text-left">
            <button
              type="button"
              aria-label="Organization options"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setMenuOpen((prev) => !prev);
              }}
              className="grid size-8 place-items-center rounded-lg text-muted transition hover:bg-[#eef0e6] hover:text-ink"
            >
              <MoreVertical size={16} />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-9 z-50 w-40 rounded-lg border border-line bg-surface py-1 text-left shadow-lg animate-in fade-in zoom-in-95 duration-100">
                {onEdit && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setMenuOpen(false);
                      onEdit(organization);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-ink transition hover:bg-[#f3f4ee]"
                  >
                    <Pencil size={13} />
                    Edit organization
                  </button>
                )}
                {organization.role === "owner" && onDelete && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setMenuOpen(false);
                      onDelete(organization);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50"
                  >
                    <Trash2 size={13} />
                    Delete organization
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
