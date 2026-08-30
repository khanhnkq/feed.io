"use client";

import type { FolderResponse } from "@feedio/api-client";
import { useGetFolderTree, useMoveFolder } from "@feedio/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { Folder as FolderIcon, FolderInput, Home } from "lucide-react";
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
import { useOrganization } from "@/shared/providers/organization_context";

interface MoveFolderDialogProps {
  folder: FolderResponse | null;
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onMoved?: () => void;
}

interface FlatTreeItem {
  id: string | null;
  name: string;
  depth: number;
  disabled: boolean;
  isCurrent: boolean;
}

export function MoveFolderDialog({
  folder,
  isOpen,
  onClose,
  projectId,
  onMoved,
}: MoveFolderDialogProps) {
  if (!folder) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      ariaLabelledBy="move-folder-dialog-title"
      ariaDescribedBy="move-folder-dialog-description"
      size="md"
    >
      <MoveFolderForm
        key={folder.id}
        folder={folder}
        projectId={projectId}
        onClose={onClose}
        onMoved={onMoved}
      />
    </Dialog>
  );
}

function MoveFolderForm({
  folder,
  projectId,
  onClose,
  onMoved,
}: {
  folder: FolderResponse;
  projectId: string;
  onClose: () => void;
  onMoved?: () => void;
}) {
  const organization = useOrganization();
  const queryClient = useQueryClient();
  const treeQuery = useGetFolderTree(organization.id, projectId);

  const [selectedParentId, setSelectedParentId] = useState<string | null>(
    folder.parent_id,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const moveFolderMutation = useMoveFolder({
    mutation: {
      onSuccess: async () => {
        setErrorMessage(null);
        await queryClient.invalidateQueries({
          predicate: (query) =>
            Array.isArray(query.queryKey) &&
            query.queryKey.some((key) => typeof key === "string" && key.includes("folders")),
        });
        onClose();
        onMoved?.();
      },
      onError: (error: unknown) => {
        const message =
          (error as { response?: { data?: { detail?: string } } })?.response
            ?.data?.detail ??
          (error as Error).message ??
          "Could not move folder. Please try again.";
        setErrorMessage(message);
      },
    },
  });

  const treeItems: FlatTreeItem[] = useMemo(() => {
    const allFolders = treeQuery.data ?? [];

    // Find all descendant IDs of the moving folder to disable them
    const descendantIds = new Set<string>([folder.id]);
    let added = true;
    while (added) {
      added = false;
      for (const f of allFolders) {
        if (f.parent_id && descendantIds.has(f.parent_id) && !descendantIds.has(f.id)) {
          descendantIds.add(f.id);
          added = true;
        }
      }
    }

    const items: FlatTreeItem[] = [
      {
        id: null,
        name: "Project Root",
        depth: 0,
        disabled: false,
        isCurrent: folder.parent_id === null,
      },
    ];

    function buildBranch(parentId: string | null, depth: number) {
      const children = allFolders.filter((f) => f.parent_id === parentId);
      children.sort((a, b) => a.name.localeCompare(b.name));
      for (const child of children) {
        items.push({
          id: child.id,
          name: child.name,
          depth,
          disabled: descendantIds.has(child.id),
          isCurrent: folder.parent_id === child.id,
        });
        buildBranch(child.id, depth + 1);
      }
    }

    buildBranch(null, 1);
    return items;
  }, [treeQuery.data, folder]);

  const isSameAsCurrent = selectedParentId === folder.parent_id;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSameAsCurrent) return;

    setErrorMessage(null);
    moveFolderMutation.mutate({
      organizationId: organization.id,
      projectId,
      folderId: folder.id,
      data: {
        new_parent_id: selectedParentId ?? undefined,
      },
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <div className="flex items-center justify-between">
          <DialogEyebrow>Move folder</DialogEyebrow>
          <DialogCloseButton
            onClick={onClose}
            disabled={moveFolderMutation.isPending}
          />
        </div>
        <DialogTitle id="move-folder-dialog-title">
          Move &ldquo;{folder.name}&rdquo;
        </DialogTitle>
        <DialogDescription id="move-folder-dialog-description">
          Select a destination folder or move to project root.
        </DialogDescription>
      </DialogHeader>

      <DialogBody className="space-y-4">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted">
            Destination
          </label>

          {treeQuery.isPending ? (
            <div className="flex min-h-36 items-center justify-center rounded-lg border border-line bg-surface p-4 text-xs text-muted">
              Loading folder structure…
            </div>
          ) : (
            <div className="max-h-60 overflow-y-auto rounded-lg border border-line bg-surface p-1.5 divide-y divide-line/40">
              {treeItems.map((item) => {
                const isSelected = selectedParentId === item.id;
                return (
                  <button
                    key={item.id ?? "root"}
                    type="button"
                    disabled={item.disabled}
                    onClick={() => {
                      if (!item.disabled) {
                        setSelectedParentId(item.id);
                      }
                    }}
                    style={{ paddingLeft: `${Math.max(item.depth * 18, 8)}px` }}
                    className={`flex w-full items-center justify-between rounded-md py-2 pr-3 text-left text-xs transition select-none ${
                      item.disabled
                        ? "cursor-not-allowed opacity-40"
                        : isSelected
                        ? "bg-ink font-bold text-white shadow-sm"
                        : "text-ink hover:bg-[#ecece5]"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {item.id === null ? (
                        <Home
                          size={14}
                          className={isSelected ? "text-lime" : "text-muted"}
                        />
                      ) : (
                        <FolderIcon
                          size={14}
                          className={isSelected ? "text-lime" : "text-muted"}
                        />
                      )}
                      <span className="truncate">{item.name}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 text-[10px]">
                      {item.isCurrent && (
                        <span
                          className={`rounded px-1.5 py-0.5 ${
                            isSelected
                              ? "bg-white/20 text-white"
                              : "bg-[#e8eae0] text-muted font-medium"
                          }`}
                        >
                          Current
                        </span>
                      )}
                      {item.disabled && item.id === folder.id && (
                        <span className="text-muted italic">(This folder)</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {errorMessage && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {errorMessage}
          </div>
        )}
      </DialogBody>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={moveFolderMutation.isPending}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={
            moveFolderMutation.isPending ||
            treeQuery.isPending ||
            isSameAsCurrent
          }
        >
          {moveFolderMutation.isPending ? (
            "Moving..."
          ) : (
            <>
              <FolderInput size={15} />
              Move here
            </>
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}
