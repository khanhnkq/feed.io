"use client";

import type { FolderResponse } from "@feedio/api-client";
import { useCreateFolder } from "@feedio/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { FolderPlus } from "lucide-react";
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

interface CreateFolderDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  parentId?: string | null;
}

export function CreateFolderDialog({
  isOpen,
  onClose,
  projectId,
  parentId = null,
}: CreateFolderDialogProps) {
  const organization = useOrganization();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const createFolderMutation = useCreateFolder();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage("Please enter a folder name.");
      return;
    }

    const tempId = `temp-${Date.now()}`;
    const optimisticFolder: FolderResponse = {
      id: tempId,
      organization_id: organization.id,
      project_id: projectId,
      parent_id: parentId ?? null,
      name: trimmedName,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

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
    // Insert into folder list queries where parent_id matches
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
          items: [...old.items, optimisticFolder],
          total: typeof old.total === "number" ? old.total + 1 : old.total,
        };
      },
    );

    // Insert into folder tree queries
    queryClient.setQueriesData<FolderResponse[]>(
      {
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey.some((k) => typeof k === "string" && k.includes(projectId) && k.includes("tree")),
      },
      (old) => {
        if (!old) return old;
        return [...old, optimisticFolder];
      },
    );

    // 3. Close dialog immediately (0ms response)
    setName("");
    setErrorMessage(null);
    onClose();

    // 4. Background mutation without blocking UI or refetching
    createFolderMutation.mutate(
      {
        organizationId: organization.id,
        projectId,
        data: {
          name: trimmedName,
          parent_id: parentId ?? undefined,
        },
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
          console.error("Failed to create folder:", err);
        },
        onSuccess: (realFolder) => {
          if (!realFolder) return;
          // Swap out optimistic temp item with real folder from server
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
                items: old.items.map((f) => (f.id === tempId ? realFolder : f)),
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
              return old.map((f) => (f.id === tempId ? realFolder : f));
            },
          );
        },
      },
    );
  };

  const handleClose = () => {
    setName("");
    setErrorMessage(null);
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      closeOnEscape={!createFolderMutation.isPending}
      ariaLabelledBy="create-folder-dialog-title"
      ariaDescribedBy="create-folder-dialog-description"
      size="md"
    >
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogEyebrow>New Directory</DialogEyebrow>
            <DialogCloseButton
              onClick={handleClose}
              disabled={createFolderMutation.isPending}
            />
          </div>
          <DialogTitle id="create-folder-dialog-title">Create new folder</DialogTitle>
          <DialogDescription id="create-folder-dialog-description">
            Organize video cuts, assets, and project files cleanly.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="folder-name-input"
              className="text-xs font-semibold uppercase tracking-wider text-muted"
            >
              Folder name
            </label>
            <input
              id="folder-name-input"
              type="text"
              required
              autoFocus
              maxLength={120}
              placeholder="e.g. Cuts V1, Raw Audio, Final Renders"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none transition focus:border-ink"
            />
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
            disabled={createFolderMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            disabled={createFolderMutation.isPending || !name.trim()}
          >
            <FolderPlus size={15} />
            {createFolderMutation.isPending ? "Creating..." : "Create Folder"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
