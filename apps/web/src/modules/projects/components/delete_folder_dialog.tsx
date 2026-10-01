"use client";

import type { FolderResponse } from "@feedio/api-client";
import { useDeleteFolder } from "@feedio/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Trash2 } from "lucide-react";
import React, { useState } from "react";

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

interface DeleteFolderDialogProps {
  folder: FolderResponse | null;
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  onDeleted?: () => void;
}

export function DeleteFolderDialog({
  folder,
  isOpen,
  onClose,
  projectId,
  onDeleted,
}: DeleteFolderDialogProps) {
  const organization = useOrganization();
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const deleteFolderMutation = useDeleteFolder();

  const handleDelete = () => {
    if (!folder) return;

    // 1. Snapshot previous query caches for rollback
    const previousFolderListQueries = queryClient.getQueriesData<{ items?: FolderResponse[]; total?: number }>({
      predicate: (query) =>
        Array.isArray(query.queryKey) &&
        query.queryKey.some((k) => typeof k === "string" && k.includes(projectId) && k.includes("folders")),
    });
    const previousFolderTreeQueries = queryClient.getQueriesData<FolderResponse[]>({
      predicate: (query) =>
        Array.isArray(query.queryKey) &&
        query.queryKey.some((k) => typeof k === "string" && k.includes(projectId) && k.includes("tree")),
    });

    // 2. Optimistic update (0ms):
    queryClient.setQueriesData<{ items?: FolderResponse[]; total?: number }>(
      {
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey.some((k) => typeof k === "string" && k.includes(projectId) && k.includes("folders")),
      },
      (old) => {
        if (!old?.items) return old;
        return {
          ...old,
          items: old.items.filter((f) => f.id !== folder.id),
          total: typeof old.total === "number" ? Math.max(0, old.total - 1) : old.total,
        };
      },
    );

    queryClient.setQueriesData<FolderResponse[]>(
      {
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey.some((k) => typeof k === "string" && k.includes(projectId) && k.includes("tree")),
      },
      (old) => {
        if (!old) return old;
        return old.filter((f) => f.id !== folder.id);
      },
    );

    // 3. Close dialog immediately (0ms)
    onClose();
    onDeleted?.();

    // 4. Background mutation without blocking UI
    deleteFolderMutation.mutate(
      {
        organizationId: organization.id,
        projectId,
        folderId: folder.id,
      },
      {
        onError: (err) => {
          // Rollback on failure
          previousFolderListQueries.forEach(([qKey, qData]) => {
            queryClient.setQueryData(qKey, qData);
          });
          previousFolderTreeQueries.forEach(([qKey, qData]) => {
            queryClient.setQueryData(qKey, qData);
          });
          console.error("Failed to delete folder:", err);
        },
      },
    );
  };

  const handleClose = () => {
    setErrorMessage(null);
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      ariaLabelledBy="delete-folder-dialog-title"
      ariaDescribedBy="delete-folder-dialog-description"
      size="md"
    >
      <DialogHeader>
        <div className="flex items-center justify-between">
          <DialogEyebrow>Danger Zone</DialogEyebrow>
          <DialogCloseButton
            onClick={handleClose}
            disabled={deleteFolderMutation.isPending}
          />
        </div>
        <DialogTitle id="delete-folder-dialog-title">Delete folder</DialogTitle>
        <DialogDescription id="delete-folder-dialog-description">
          Are you sure you want to delete this folder?
        </DialogDescription>
      </DialogHeader>

      <DialogBody className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50/70 p-3.5 text-xs text-red-800">
          <AlertTriangle className="size-4 shrink-0 text-red-600 mt-0.5" />
          <div>
            <p className="font-semibold text-red-900">
              Folder &ldquo;{folder?.name}&rdquo; will be deleted
            </p>
            <p className="mt-1 leading-relaxed text-red-700">
              All subfolders and media files contained inside this folder will also be removed.
            </p>
          </div>
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
          onClick={handleClose}
          disabled={deleteFolderMutation.isPending}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="danger"
          onClick={handleDelete}
          disabled={deleteFolderMutation.isPending}
        >
          <Trash2 size={15} />
          {deleteFolderMutation.isPending ? "Deleting..." : "Delete Folder"}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
