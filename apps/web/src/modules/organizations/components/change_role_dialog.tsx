"use client";

import { useState } from "react";
import { useUpdateMemberRole } from "@feedio/api-client";
import { AlertCircle, ShieldCheck } from "lucide-react";

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

interface ChangeRoleDialogProps {
  organizationId: string;
  member: {
    userId: string;
    displayName: string;
    email: string;
    currentRole: "owner" | "admin" | "member";
  } | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ChangeRoleDialog({
  organizationId,
  member,
  isOpen,
  onClose,
  onSuccess,
}: ChangeRoleDialogProps) {
  if (!member) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      ariaLabelledBy="role-dialog-title"
      size="md"
    >
      <ChangeRoleForm
        key={`${member.userId}-${member.currentRole}`}
        organizationId={organizationId}
        member={member}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    </Dialog>
  );
}

function ChangeRoleForm({
  organizationId,
  member,
  onClose,
  onSuccess,
}: {
  organizationId: string;
  member: {
    userId: string;
    displayName: string;
    email: string;
    currentRole: "owner" | "admin" | "member";
  };
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [selectedRole, setSelectedRole] = useState<"member" | "admin" | "owner">(
    member.currentRole
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const updateRoleMutation = useUpdateMemberRole({
    mutation: {
      onSuccess: () => {
        onSuccess();
        onClose();
      },
      onError: (error: unknown) => {
        const err = error as { response?: { data?: { detail?: string } } };
        const detail = err.response?.data?.detail;
        if (detail) {
          setErrorMessage(detail);
        } else {
          setErrorMessage("Failed to update role. Please try again.");
        }
      },
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    updateRoleMutation.mutate({
      organizationId,
      userId: member.userId,
      data: {
        role: selectedRole,
      },
    });
  };

  return (
    <>
      <DialogCloseButton
        onClick={onClose}
        disabled={updateRoleMutation.isPending}
      />

      <DialogHeader>
        <DialogEyebrow>Role Configuration</DialogEyebrow>
        <DialogTitle id="role-dialog-title">
          Change member role
        </DialogTitle>
        <DialogDescription>
          Update the organization permissions for{" "}
          <strong className="text-ink">{member.displayName}</strong> ({member.email}).
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="change-role-select"
              className="block font-mono text-[11px] font-bold uppercase tracking-wider text-muted"
            >
              Select new role
            </label>
            <select
              id="change-role-select"
              value={selectedRole}
              onChange={(e) =>
                setSelectedRole(e.target.value as "member" | "admin" | "owner")
              }
              disabled={updateRoleMutation.isPending}
              className="mt-1.5 w-full rounded-lg border border-[#d8dad0] bg-white px-3.5 py-2.5 text-[14px] text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10 disabled:opacity-50"
            >
              <option value="member">Member — Regular collaboration access</option>
              <option value="admin">Admin — Management and invite access</option>
              <option value="owner">Owner — Full organization ownership</option>
            </select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={updateRoleMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                updateRoleMutation.isPending || selectedRole === member.currentRole
              }
              className="flex items-center gap-2"
            >
              <ShieldCheck className="size-4" />
              {updateRoleMutation.isPending ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogBody>
    </>
  );
}
