"use client";

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

  const createFolderMutation = useCreateFolder({
    mutation: {
      onSuccess: async () => {
        setName("");
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
          "Could not create folder. Please try again.";
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
    createFolderMutation.mutate({
      organizationId: organization.id,
      projectId,
      data: {
        name: trimmedName,
        parent_id: parentId ?? undefined,
      },
    });
  };

  const handleClose = () => {
    if (!createFolderMutation.isPending) {
      setName("");
      setErrorMessage(null);
      onClose();
    }
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
