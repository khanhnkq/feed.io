"use client";

import { useGetFolderTree, useMoveMedia } from "@feedio/api-client";
import type { FolderResponse, MediaResponse } from "@feedio/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { Folder as FolderIcon, Home, Loader2 } from "lucide-react";
import React, { useMemo, useState } from "react";
import {
  Button,
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogDescription,
  DialogEyebrow,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/modules/ui";

interface MoveMediaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  projectId: string;
  media: MediaResponse | null;
}

interface FlatTreeItem {
  id: string | null;
  name: string;
  depth: number;
}

export function MoveMediaDialog({
  open,
  onOpenChange,
  organizationId,
  projectId,
  media,
}: MoveMediaDialogProps) {
  const queryClient = useQueryClient();
  const treeQuery = useGetFolderTree(organizationId, projectId);
  const moveMutation = useMoveMedia();

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(
    media?.folder_id ?? null
  );

  // Flatten folder tree
  const treeItems: FlatTreeItem[] = useMemo(() => {
    const allFolders: FolderResponse[] = treeQuery.data ?? [];
    const childrenMap = new Map<string | null, FolderResponse[]>();

    for (const f of allFolders) {
      const pid = f.parent_id ?? null;
      if (!childrenMap.has(pid)) childrenMap.set(pid, []);
      childrenMap.get(pid)!.push(f);
    }

    const items: FlatTreeItem[] = [
      { id: null, name: "Project Root", depth: 0 },
    ];

    function addChildren(parentId: string | null, depth: number) {
      const children = childrenMap.get(parentId) ?? [];
      for (const child of children) {
        items.push({
          id: child.id,
          name: child.name,
          depth,
        });
        addChildren(child.id, depth + 1);
      }
    }

    addChildren(null, 1);
    return items;
  }, [treeQuery.data]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!media) return;

    try {
      await moveMutation.mutateAsync({
        organizationId,
        projectId,
        mediaId: media.id,
        data: { target_folder_id: selectedFolderId },
      });
      await queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey.some(
            (k) =>
              typeof k === "string" &&
              (k.includes(projectId) || k.includes("media") || k.includes("folders")),
          ),
      });
      onOpenChange(false);
    } catch {
      // Handled by mutation
    }
  };

  if (!media) return null;

  return (
    <Dialog isOpen={open} onClose={() => onOpenChange(false)} size="md">
      <DialogHeader>
        <div className="flex items-center justify-between">
          <DialogEyebrow>Move Asset</DialogEyebrow>
          <DialogCloseButton onClick={() => onOpenChange(false)} />
        </div>
        <DialogTitle id="move-media-dialog-title">Move video cut</DialogTitle>
        <DialogDescription id="move-media-dialog-description">
          Select destination folder for &quot;{media.title}&quot;
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit}>
        <DialogBody className="space-y-4">
          <div className="max-h-60 overflow-y-auto rounded-lg border border-line bg-paper p-1.5 space-y-1">
            {treeItems.map((item) => {
              const isSelected = selectedFolderId === item.id;
              const isCurrent = media.folder_id === item.id;

              return (
                <button
                  key={item.id ?? "root"}
                  type="button"
                  onClick={() => setSelectedFolderId(item.id)}
                  style={{ paddingLeft: `${item.depth * 14 + 10}px` }}
                  className={`flex w-full items-center justify-between rounded-lg py-2 pr-3 text-left text-xs font-semibold transition-all ${
                    isSelected
                      ? "border border-ink bg-surface text-ink shadow-[2px_2px_0px_#11130f]"
                      : "border border-transparent text-muted hover:bg-surface/60 hover:text-ink"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {item.id === null ? (
                      <Home size={14} className="shrink-0 text-ink" />
                    ) : (
                      <FolderIcon size={14} className="shrink-0 text-ink" />
                    )}
                    <span className="truncate">{item.name}</span>
                  </div>

                  {isCurrent && (
                    <span className="text-[10px] font-mono text-muted uppercase">
                      (Current)
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </DialogBody>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={moveMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={selectedFolderId === media.folder_id || moveMutation.isPending}
          >
            {moveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Move here
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
