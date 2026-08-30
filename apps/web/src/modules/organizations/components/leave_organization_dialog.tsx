"use client";

import type { OrganizationResponse } from "@feedio/api-client";
import { getListOrganizationsQueryKey, useLeaveOrganization } from "@feedio/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
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

interface LeaveOrganizationDialogProps {
  organization: OrganizationResponse | null;
  isOpen: boolean;
  onClose: () => void;
  onLeft?: () => void;
}

export function LeaveOrganizationDialog({
  organization,
  isOpen,
  onClose,
  onLeft,
}: LeaveOrganizationDialogProps) {
  if (!organization) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      ariaLabelledBy="leave-org-dialog-title"
      ariaDescribedBy="leave-org-dialog-description"
      size="md"
    >
      <LeaveOrganizationForm
        key={`${organization.id}-${organization.name}`}
        organization={organization}
        onClose={onClose}
        onLeft={onLeft}
      />
    </Dialog>
  );
}

function LeaveOrganizationForm({
  organization,
  onClose,
  onLeft,
}: {
  organization: OrganizationResponse;
  onClose: () => void;
  onLeft?: () => void;
}) {
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const leaveOrgMutation = useLeaveOrganization({
    mutation: {
      onSuccess: async () => {
        setErrorMessage(null);
        await queryClient.invalidateQueries({
          queryKey: getListOrganizationsQueryKey(),
        });
        onClose();
        onLeft?.();
      },
      onError: (error: unknown) => {
        const message =
          (error as { response?: { data?: { detail?: string } } })?.response
            ?.data?.detail ??
          (error as Error).message ??
          "Could not leave organization. Please try again.";
        setErrorMessage(message);
      },
    },
  });

  const handleLeave = () => {
    setErrorMessage(null);
    leaveOrgMutation.mutate({
      organizationId: organization.id,
    });
  };

  return (
    <div>
      <DialogHeader>
        <div className="flex items-center justify-between">
          <DialogEyebrow>Membership</DialogEyebrow>
          <DialogCloseButton
            onClick={onClose}
            disabled={leaveOrgMutation.isPending}
          />
        </div>
        <DialogTitle id="leave-org-dialog-title">Leave organization</DialogTitle>
        <DialogDescription id="leave-org-dialog-description">
          Are you sure you want to leave &ldquo;{organization.name}&rdquo;?
        </DialogDescription>
      </DialogHeader>

      <DialogBody className="space-y-4">
        <p className="text-xs text-muted leading-relaxed">
          You will lose access to all projects, folders, and shared media in this organization. You will need an invite from an admin to rejoin.
        </p>

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
          disabled={leaveOrgMutation.isPending}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="danger"
          onClick={handleLeave}
          disabled={leaveOrgMutation.isPending}
        >
          <LogOut size={15} />
          {leaveOrgMutation.isPending ? "Leaving..." : "Leave Organization"}
        </Button>
      </DialogFooter>
    </div>
  );
}
