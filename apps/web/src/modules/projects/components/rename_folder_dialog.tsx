"use client";

import type { FolderResponse } from "@feedio/api-client";
import { useRenameFolder } from "@feedio/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
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

interface RenameFolderDialogProps {
  folder: FolderResponse | null;
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

export function RenameFolderDialog({
  folder,
  isOpen,
  onClose,
  projectId,
}: RenameFolderDialogProps) {
  if (!folder) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      ariaLabelledBy="rename-folder-dialog-title"
      ariaDescribedBy="rename-folder-dialog-description"
      size="md"
    >
      <RenameFolderForm
        key={`${folder.id}-${folder.name}`}
        folder={folder}
        projectId={projectId}
        onClose={onClose}
      />
    </Dialog>
  );
}

function RenameFolderForm({
  folder,
  projectId,
  onClose,
}: {
  folder: FolderResponse;
  projectId: string;
  onClose: () => void;
}) {
  const organization = useOrganization();
  const queryClient = useQueryClient();
  const [name, setName] = useState(folder.name);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const renameFolderMutation = useRenameFolder();

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage("Please enter a folder name.");
      return;
    }
    if (trimmedName === folder.name) {
      onClose();
      return;
    }

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
          items: old.items.map((f) => (f.id === folder.id ? { ...f, name: trimmedName } : f)),
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
        return old.map((f) => (f.id === folder.id ? { ...f, name: trimmedName } : f));
      },
    );

    // 3. Close dialog immediately (0ms)
    onClose();

    // 4. Background mutation without blocking UI
    renameFolderMutation.mutate(
      {
        organizationId: organization.id,
        projectId,
        folderId: folder.id,
        data: {
          name: trimmedName,
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
          console.error("Failed to rename folder:", err);
        },
        onSuccess: (updatedFolder) => {
          if (!updatedFolder) return;
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
                items: old.items.map((f) => (f.id === folder.id ? { ...f, ...updatedFolder } : f)),
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
              return old.map((f) => (f.id === folder.id ? { ...f, ...updatedFolder } : f));
            },
          );
        },
      },
    );
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <div className="flex items-center justify-between">
          <DialogEyebrow>Folder Settings</DialogEyebrow>
          <DialogCloseButton
            onClick={onClose}
            disabled={renameFolderMutation.isPending}
          />
        </div>
        <DialogTitle id="rename-folder-dialog-title">Rename folder</DialogTitle>
        <DialogDescription id="rename-folder-dialog-description">
          Change the name of this folder across the project.
        </DialogDescription>
      </DialogHeader>

      <DialogBody className="space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor="rename-folder-name-input"
            className="text-xs font-semibold uppercase tracking-wider text-muted"
          >
            Folder name
          </label>
          <input
            id="rename-folder-name-input"
            type="text"
            required
            autoFocus
            maxLength={120}
            placeholder="e.g. Cuts V1"
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
          onClick={onClose}
          disabled={renameFolderMutation.isPending}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={renameFolderMutation.isPending || !name.trim()}
        >
          <Check size={15} />
          {renameFolderMutation.isPending ? "Saving..." : "Save changes"}
        </Button>
      </DialogFooter>
    </form>
  );
}
