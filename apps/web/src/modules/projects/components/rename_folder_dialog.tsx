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

  const renameFolderMutation = useRenameFolder({
    mutation: {
      onSuccess: async () => {
        setErrorMessage(null);
        await queryClient.invalidateQueries({
          predicate: (query) =>
            Array.isArray(query.queryKey) &&
            query.queryKey.some((key) => typeof key === "string" && key.includes("folders")),
        });
        onClose();
      },
      onError: (error: unknown) => {
        const message =
          (error as { response?: { data?: { detail?: string } } })?.response
            ?.data?.detail ??
          (error as Error).message ??
          "Could not rename folder. Please try again.";
        setErrorMessage(message);
      },
    },
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage("Please enter a folder name.");
      return;
    }

    setErrorMessage(null);
    renameFolderMutation.mutate({
      organizationId: organization.id,
      projectId,
      folderId: folder.id,
      data: {
        name: trimmedName,
      },
    });
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
