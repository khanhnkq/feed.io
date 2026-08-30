"use client";

import type { OrganizationResponse } from "@feedio/api-client";
import { getListOrganizationsQueryKey, useUpdateOrganization } from "@feedio/api-client";
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

interface EditOrganizationDialogProps {
  organization: OrganizationResponse | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: (updated: OrganizationResponse) => void;
}

export function EditOrganizationDialog({
  organization,
  isOpen,
  onClose,
  onUpdated,
}: EditOrganizationDialogProps) {
  if (!organization) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      ariaLabelledBy="edit-org-dialog-title"
      ariaDescribedBy="edit-org-dialog-description"
      size="md"
    >
      <EditOrganizationForm
        key={`${organization.id}-${organization.name}`}
        organization={organization}
        onClose={onClose}
        onUpdated={onUpdated}
      />
    </Dialog>
  );
}

function EditOrganizationForm({
  organization,
  onClose,
  onUpdated,
}: {
  organization: OrganizationResponse;
  onClose: () => void;
  onUpdated?: (updated: OrganizationResponse) => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(organization.name);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const updateOrgMutation = useUpdateOrganization({
    mutation: {
      onSuccess: async (data) => {
        setErrorMessage(null);
        await queryClient.invalidateQueries({
          queryKey: getListOrganizationsQueryKey(),
        });
        onClose();
        onUpdated?.(data);
      },
      onError: (error: unknown) => {
        const message =
          (error as { response?: { data?: { detail?: string } } })?.response
            ?.data?.detail ??
          (error as Error).message ??
          "Could not update organization. Please try again.";
        setErrorMessage(message);
      },
    },
  });

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage("Please enter an organization name.");
      return;
    }

    setErrorMessage(null);
    updateOrgMutation.mutate({
      organizationId: organization.id,
      data: {
        name: trimmedName,
      },
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <div className="flex items-center justify-between">
          <DialogEyebrow>Organization Settings</DialogEyebrow>
          <DialogCloseButton
            onClick={onClose}
            disabled={updateOrgMutation.isPending}
          />
        </div>
        <DialogTitle id="edit-org-dialog-title">Edit organization</DialogTitle>
        <DialogDescription id="edit-org-dialog-description">
          Update the display name of your organization.
        </DialogDescription>
      </DialogHeader>

      <DialogBody className="space-y-4">
        <div className="space-y-1.5">
          <label
            htmlFor="edit-org-name-input"
            className="text-xs font-semibold uppercase tracking-wider text-muted"
          >
            Organization name
          </label>
          <input
            id="edit-org-name-input"
            type="text"
            required
            autoFocus
            maxLength={120}
            placeholder="e.g. Acme Studios"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ink outline-none transition focus:border-ink"
          />
        </div>

        <div className="rounded-lg border border-line bg-surface-hover/50 p-3">
          <p className="text-xs text-muted">
            <span className="font-semibold text-ink">Slug:</span>{" "}
            <span className="font-mono">{organization.slug}</span>
          </p>
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
          disabled={updateOrgMutation.isPending}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          disabled={updateOrgMutation.isPending || !name.trim()}
        >
          <Check size={15} />
          {updateOrgMutation.isPending ? "Saving..." : "Save changes"}
        </Button>
      </DialogFooter>
    </form>
  );
}
