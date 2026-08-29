"use client";

import type { FolderResponse } from "@feedio/api-client";
import { Folder, MoreVertical, Pencil, Trash2 } from "lucide-react";
import React, { useEffect, useRef, useState } from "react";

interface FolderCardProps {
  folder: FolderResponse;
  onOpen: (folder: FolderResponse) => void;
  onRename: (folder: FolderResponse) => void;
  onDelete: (folder: FolderResponse) => void;
}

export function FolderCard({
  folder,
  onOpen,
  onRename,
  onDelete,
}: FolderCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const createdAt = new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(folder.created_at));

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
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(folder)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen(folder);
        }
      }}
      className="group relative flex cursor-pointer items-center justify-between rounded-xl border border-line bg-surface p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#b4b7aa] hover:shadow-[0_8px_24px_rgba(20,21,18,0.06)]"
    >
      <div className="flex min-w-0 items-center gap-3.5">
        <div className="grid size-10 shrink-0 place-items-center rounded-lg border border-[#e2e4db] bg-[#f8f9f3] text-ink transition-colors group-hover:border-lime group-hover:bg-[#f0f3e6]">
          <Folder size={18} className="fill-current/10" />
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold tracking-tight text-ink group-hover:text-black">
            {folder.name}
          </h3>
          <p className="font-mono text-[11px] text-muted">{createdAt}</p>
        </div>
      </div>

      <div
        ref={menuRef}
        className="relative shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Folder options"
          onClick={() => setMenuOpen((prev) => !prev)}
          className="grid size-8 place-items-center rounded-lg text-muted transition hover:bg-[#eef0e6] hover:text-ink"
        >
          <MoreVertical size={16} />
        </button>

        {menuOpen && (
          <div className="absolute right-0 top-9 z-20 w-36 rounded-lg border border-line bg-surface py-1 shadow-lg animate-in fade-in zoom-in-95 duration-100">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onRename(folder);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-ink transition hover:bg-[#f3f4ee]"
            >
              <Pencil size={13} />
              Rename
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                onDelete(folder);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50"
            >
              <Trash2 size={13} />
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
