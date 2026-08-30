"use client";

import type { OrganizationResponse } from "@feedio/api-client";
import { ArrowRight, MoreVertical, Pencil, Trash2 } from "lucide-react";
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

interface OrganizationCardProps {
  organization: OrganizationResponse;
  index: number;
  onEdit?: (org: OrganizationResponse) => void;
  onDelete?: (org: OrganizationResponse) => void;
}

export function OrganizationCard({
  organization,
  index,
  onEdit,
  onDelete,
}: OrganizationCardProps) {
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
    <Card href={`/app/organizations/${organization.slug}`}>
      <CardContent>
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <CardBadge>{String(index + 1).padStart(2, "0")}</CardBadge>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
              {organization.slug}
            </span>
          </div>

          {(onEdit || onDelete) && (
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
                aria-label="Organization options"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setMenuOpen((prev) => !prev);
                }}
                className="grid size-7 place-items-center rounded-md text-muted transition hover:bg-[#eef0e6] hover:text-ink"
              >
                <MoreVertical size={15} />
              </button>

              {menuOpen && (
                <div className="absolute right-0 top-8 z-20 w-40 rounded-lg border border-line bg-surface py-1 shadow-lg animate-in fade-in zoom-in-95 duration-100">
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
                  {onDelete && (
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
        </CardHeader>
        <CardTitle>{organization.name}</CardTitle>
        <CardDescription>
          Open organization to review media and manage projects.
        </CardDescription>
      </CardContent>
      <CardFooter>
        <span>Open organization</span>
        <ArrowRight size={16} className="transition group-hover:translate-x-1" />
      </CardFooter>
    </Card>
  );
}
