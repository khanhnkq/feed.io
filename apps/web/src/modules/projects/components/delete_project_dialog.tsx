"use client";

import type { ProjectResponse } from "@feedio/api-client";
import { getListProjectsQueryKey, useDeleteProject } from "@feedio/api-client";
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

interface DeleteProjectDialogProps {
  project: ProjectResponse | null;
  isOpen: boolean;
  onClose: () => void;
  onDeleted?: () => void;
}

export function DeleteProjectDialog({
  project,
  isOpen,
  onClose,
  onDeleted,
}: DeleteProjectDialogProps) {
  const organization = useOrganization();
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const deleteProjectMutation = useDeleteProject({
    mutation: {
      onSuccess: async () => {
        setErrorMessage(null);
        await queryClient.invalidateQueries({
          queryKey: getListProjectsQueryKey(organization.id),
        });
        onClose();
        onDeleted?.();
      },
      onError: (error: unknown) => {
        const message =
          (error as { response?: { data?: { detail?: string } } })?.response
            ?.data?.detail ??
          (error as Error).message ??
          "Could not delete project. Please try again.";
        setErrorMessage(message);
      },
    },
  });

  const handleDelete = () => {
    if (!project) return;
    setErrorMessage(null);
    deleteProjectMutation.mutate({
      organizationId: organization.id,
      projectId: project.id,
    });
  };

  const handleClose = () => {
    if (!deleteProjectMutation.isPending) {
      setErrorMessage(null);
      onClose();
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      ariaLabelledBy="delete-project-dialog-title"
      ariaDescribedBy="delete-project-dialog-description"
      size="md"
    >
      <DialogHeader>
        <div className="flex items-center justify-between">
          <DialogEyebrow>Danger Zone</DialogEyebrow>
          <DialogCloseButton
            onClick={handleClose}
            disabled={deleteProjectMutation.isPending}
          />
        </div>
        <DialogTitle id="delete-project-dialog-title">Delete project</DialogTitle>
        <DialogDescription id="delete-project-dialog-description">
          Are you sure you want to permanently delete this project?
        </DialogDescription>
      </DialogHeader>

      <DialogBody className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50/70 p-3.5 text-xs text-red-800">
          <AlertTriangle className="size-4 shrink-0 text-red-600 mt-0.5" />
          <div>
            <p className="font-semibold text-red-900">
              Project &ldquo;{project?.name}&rdquo; will be deleted
            </p>
            <p className="mt-1 leading-relaxed text-red-700">
              All folders, video cuts, comments, and reviews in this project will be permanently removed. This action cannot be undone.
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
          disabled={deleteProjectMutation.isPending}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="danger"
          onClick={handleDelete}
          disabled={deleteProjectMutation.isPending}
        >
          <Trash2 size={15} />
          {deleteProjectMutation.isPending ? "Deleting..." : "Delete Project"}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
