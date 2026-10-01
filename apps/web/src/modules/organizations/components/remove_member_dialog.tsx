"use client";

import { useState } from "react";
import type { OrganizationMemberResponse } from "@feedio/api-client";
import { useRemoveMember } from "@feedio/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Trash2, UserMinus } from "lucide-react";

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

interface RemoveMemberDialogProps {
  organizationId: string;
  member: {
    userId: string;
    displayName: string;
    email: string;
  } | null;
  isSelf: boolean;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function RemoveMemberDialog({
  organizationId,
  member,
  isSelf,
  isOpen,
  onClose,
  onSuccess,
}: RemoveMemberDialogProps) {
  if (!member) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      ariaLabelledBy="remove-dialog-title"
      size="md"
    >
      <RemoveMemberForm
        key={member.userId}
        organizationId={organizationId}
        member={member}
        isSelf={isSelf}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    </Dialog>
  );
}

function RemoveMemberForm({
  organizationId,
  member,
  isSelf,
  onClose,
  onSuccess,
}: {
  organizationId: string;
  member: {
    userId: string;
    displayName: string;
    email: string;
  };
  isSelf: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const queryClient = useQueryClient();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const removeMutation = useRemoveMember();

  const handleConfirm = () => {
    // 1. Snapshot previous query cache for rollback
    const previousMembersQueries = queryClient.getQueriesData<{ items?: OrganizationMemberResponse[]; total?: number }>({
      predicate: (query) =>
        Array.isArray(query.queryKey) &&
        query.queryKey.some((k) => typeof k === "string" && k.includes(organizationId) && k.includes("members")),
    });

    // 2. Optimistic update (0ms):
    queryClient.setQueriesData<{ items?: OrganizationMemberResponse[]; total?: number }>(
      {
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey.some((k) => typeof k === "string" && k.includes(organizationId) && k.includes("members")),
      },
      (old) => {
        if (!old?.items) return old;
        return {
          ...old,
          items: old.items.filter((m) => m.user_id !== member.userId),
          total: typeof old.total === "number" ? Math.max(0, old.total - 1) : old.total,
        };
      },
    );

    // 3. Close dialog immediately (0ms)
    onClose();
    onSuccess();

    // 4. Background mutation without blocking UI
    removeMutation.mutate(
      {
        organizationId,
        userId: member.userId,
      },
      {
        onError: (err) => {
          // Rollback on failure
          previousMembersQueries.forEach(([qKey, qData]) => {
            queryClient.setQueryData(qKey, qData);
          });
          console.error("Failed to remove member:", err);
        },
      },
    );
  };

  return (
    <>
      <DialogCloseButton
        onClick={onClose}
        disabled={removeMutation.isPending}
      />

      <DialogHeader>
        <DialogEyebrow className="text-red-600">
          {isSelf ? "Leave Organization" : "Remove Member"}
        </DialogEyebrow>
        <DialogTitle id="remove-dialog-title">
          {isSelf ? "Leave this organization?" : "Remove team member?"}
        </DialogTitle>
        <DialogDescription>
          {isSelf
            ? "Are you sure you want to leave this organization? You will lose access to all its projects, media, and review links."
            : `Are you sure you want to remove ${member.displayName} (${member.email}) from this organization? They will immediately lose access.`}
        </DialogDescription>
      </DialogHeader>

      <DialogBody>
        {errorMessage && (
          <div
            role="alert"
            className="mb-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-[13px] text-red-800"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={removeMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={handleConfirm}
            disabled={removeMutation.isPending}
            className="flex items-center gap-2"
          >
            {isSelf ? (
              <UserMinus className="size-4" />
            ) : (
              <Trash2 className="size-4" />
            )}
            {removeMutation.isPending
              ? "Removing..."
              : isSelf
              ? "Leave organization"
              : "Remove member"}
          </Button>
        </DialogFooter>
      </DialogBody>
    </>
  );
}
