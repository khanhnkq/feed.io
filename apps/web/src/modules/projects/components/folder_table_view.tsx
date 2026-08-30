"use client";

import type { FolderResponse } from "@feedio/api-client";
import { Folder, FolderInput, MoreVertical, Pencil, Trash2 } from "lucide-react";
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

interface FolderTableViewProps {
  folders: FolderResponse[];
  onOpen: (folder: FolderResponse) => void;
  onRename: (folder: FolderResponse) => void;
  onMove?: (folder: FolderResponse) => void;
  onDelete: (folder: FolderResponse) => void;
}

export function FolderTableView({
  folders,
  onOpen,
  onRename,
  onMove,
  onDelete,
}: FolderTableViewProps) {
  return (
    <TableContainer>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="hidden sm:table-cell">Type</TableHead>
            <TableHead className="hidden md:table-cell">Created</TableHead>
            <TableHead align="right" className="w-24">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {folders.map((folder) => (
            <FolderTableRow
              key={folder.id}
              folder={folder}
              onOpen={onOpen}
              onRename={onRename}
              onMove={onMove}
              onDelete={onDelete}
            />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

function FolderTableRow({
  folder,
  onOpen,
  onRename,
  onMove,
  onDelete,
}: {
  folder: FolderResponse;
  onOpen: (folder: FolderResponse) => void;
  onRename: (folder: FolderResponse) => void;
  onMove?: (folder: FolderResponse) => void;
  onDelete: (folder: FolderResponse) => void;
}) {
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
    <TableRow
      isClickable
      onClick={() => onOpen(folder)}
      className="group cursor-pointer hover:bg-[#f5f6ee]/80"
    >
      <TableCell>
        <div className="flex items-center gap-3">
          <CardBadge className="shrink-0 transition-transform duration-150 group-hover:scale-105">
            <Folder size={17} className="text-ink" />
          </CardBadge>
          <span className="truncate font-bold text-ink group-hover:text-black">
            {folder.name}
          </span>
        </div>
      </TableCell>
      <TableCell className="hidden sm:table-cell font-mono text-xs text-muted">
        Directory
      </TableCell>
      <TableCell className="hidden md:table-cell font-mono text-xs text-muted">
        {createdAt}
      </TableCell>
      <TableCell align="right" onClick={(e) => e.stopPropagation()}>
        <div ref={menuRef} className="relative inline-block text-left">
          <button
            type="button"
            aria-label="Folder options"
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
            <div className="absolute right-0 top-9 z-50 w-36 rounded-lg border border-line bg-surface py-1 text-left shadow-lg animate-in fade-in zoom-in-95 duration-100">
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setMenuOpen(false);
                  onRename(folder);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-ink transition hover:bg-[#f3f4ee]"
              >
                <Pencil size={13} />
                Rename
              </button>
              {onMove && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setMenuOpen(false);
                    onMove(folder);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-ink transition hover:bg-[#f3f4ee]"
                >
                  <FolderInput size={13} />
                  Move to…
                </button>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
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
      </TableCell>
    </TableRow>
  );
}
