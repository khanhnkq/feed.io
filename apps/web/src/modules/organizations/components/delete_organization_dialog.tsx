"use client";

import type { OrganizationResponse } from "@feedio/api-client";
import { getListOrganizationsQueryKey, useDeleteOrganization } from "@feedio/api-client";
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

interface DeleteOrganizationDialogProps {
  organization: OrganizationResponse | null;
  isOpen: boolean;
  onClose: () => void;
  onDeleted?: () => void;
}

export function DeleteOrganizationDialog({
  organization,
  isOpen,
  onClose,
  onDeleted,
}: DeleteOrganizationDialogProps) {
  if (!organization) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      ariaLabelledBy="delete-org-dialog-title"
      ariaDescribedBy="delete-org-dialog-description"
      size="md"
    >
      <DeleteOrganizationForm
        key={`${organization.id}-${organization.name}`}
        organization={organization}
        onClose={onClose}
        onDeleted={onDeleted}
      />
    </Dialog>
  );
}

function DeleteOrganizationForm({
  organization,
  onClose,
  onDeleted,
}: {
  organization: OrganizationResponse;
  onClose: () => void;
  onDeleted?: () => void;
}) {
  const queryClient = useQueryClient();
  const [confirmName, setConfirmName] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const deleteOrgMutation = useDeleteOrganization({
    mutation: {
      onSuccess: async () => {
        setErrorMessage(null);
        await queryClient.invalidateQueries({
          queryKey: getListOrganizationsQueryKey(),
        });
        onClose();
        onDeleted?.();
      },
      onError: (error: unknown) => {
        const message =
          (error as { response?: { data?: { detail?: string } } })?.response
            ?.data?.detail ??
          (error as Error).message ??
          "Could not delete organization. Please try again.";
        setErrorMessage(message);
      },
    },
  });

  const isConfirmed = confirmName.trim() === organization.name.trim();

  const handleDelete = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConfirmed) return;
    setErrorMessage(null);
    deleteOrgMutation.mutate({
      organizationId: organization.id,
    });
  };

  return (
    <form onSubmit={handleDelete}>
      <DialogHeader>
        <div className="flex items-center justify-between">
          <DialogEyebrow>Danger Zone</DialogEyebrow>
          <DialogCloseButton
            onClick={onClose}
            disabled={deleteOrgMutation.isPending}
          />
        </div>
        <DialogTitle id="delete-org-dialog-title">Delete organization</DialogTitle>
        <DialogDescription id="delete-org-dialog-description">
          This action will permanently delete this organization and all its data.
        </DialogDescription>
      </DialogHeader>

      <DialogBody className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50/70 p-3.5 text-xs text-red-800">
          <AlertTriangle className="size-4 shrink-0 text-red-600 mt-0.5" />
          <div>
            <p className="font-semibold text-red-900">
              Organization &ldquo;{organization.name}&rdquo; will be deleted
            </p>
            <p className="mt-1 leading-relaxed text-red-700">
              All projects, folders, video assets, feedback, and team member access will be permanently removed. This action cannot be reversed.
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="confirm-org-name-input"
            className="text-xs font-semibold uppercase tracking-wider text-muted"
          >
            Type <span className="font-mono font-bold text-ink">{organization.name}</span> to confirm:
          </label>
          <input
            id="confirm-org-name-input"
            type="text"
            required
            autoFocus
            placeholder={organization.name}
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none transition focus:border-red-500"
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
          disabled={deleteOrgMutation.isPending}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="danger"
          disabled={deleteOrgMutation.isPending || !isConfirmed}
        >
          <Trash2 size={15} />
          {deleteOrgMutation.isPending ? "Deleting..." : "Delete Organization"}
        </Button>
      </DialogFooter>
    </form>
  );
}
