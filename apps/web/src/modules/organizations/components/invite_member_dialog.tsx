"use client";

import { useState, type FormEvent } from "react";
import { useInviteMember } from "@feedio/api-client";
import { AlertCircle, CheckCircle2, UserPlus } from "lucide-react";

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

interface InviteMemberDialogProps {
  organizationId: string;
  isOpen: boolean;
  currentUserRole: "owner" | "admin" | "member";
  onClose: () => void;
  onSuccess: () => void;
}

export function InviteMemberDialog({
  organizationId,
  isOpen,
  currentUserRole,
  onClose,
  onSuccess,
}: InviteMemberDialogProps) {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      ariaLabelledBy="invite-dialog-title"
      size="md"
    >
      <InviteMemberForm
        organizationId={organizationId}
        currentUserRole={currentUserRole}
        onClose={onClose}
        onSuccess={onSuccess}
      />
    </Dialog>
  );
}

function InviteMemberForm({
  organizationId,
  currentUserRole,
  onClose,
  onSuccess,
}: {
  organizationId: string;
  currentUserRole: "owner" | "admin" | "member";
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "admin" | "owner">("member");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const inviteMutation = useInviteMember({
    mutation: {
      onSuccess: () => {
        setSuccessMessage(`Invitation sent to ${email}`);
        setErrorMessage(null);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1200);
      },
      onError: (error: unknown) => {
        const err = error as { response?: { data?: { detail?: string } } };
        const detail = err.response?.data?.detail;
        if (detail) {
          setErrorMessage(detail);
        } else {
          setErrorMessage(
            "Failed to send invitation. Please check the email and try again."
          );
        }
      },
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage("Please enter an email address.");
      return;
    }

    inviteMutation.mutate({
      organizationId,
      data: {
        email: trimmedEmail,
        role,
      },
    });
  };

  return (
    <>
      <DialogCloseButton
        onClick={onClose}
        disabled={inviteMutation.isPending}
      />

      <DialogHeader>
        <DialogEyebrow>Organization Access</DialogEyebrow>
        <DialogTitle id="invite-dialog-title">
          Invite team member
        </DialogTitle>
        <DialogDescription>
          Send an invitation link to an existing Feed.io user to join this organization.
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

        {successMessage && (
          <div
            role="status"
            className="mb-4 flex items-center gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-[13px] text-emerald-800"
          >
            <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="invite-email"
              className="block font-mono text-[11px] font-bold uppercase tracking-wider text-muted"
            >
              Email address
            </label>
            <input
              id="invite-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@agency.com"
              disabled={inviteMutation.isPending}
              className="mt-1.5 w-full rounded-lg border border-[#d8dad0] bg-white px-3.5 py-2.5 text-[14px] text-ink placeholder:text-[#9ea196] focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10 disabled:opacity-50"
            />
            <p className="mt-1.5 text-[12px] text-muted">
              Note: The user must already have a verified Feed.io account.
            </p>
          </div>

          <div>
            <label
              htmlFor="invite-role"
              className="block font-mono text-[11px] font-bold uppercase tracking-wider text-muted"
            >
              Organization Role
            </label>
            <select
              id="invite-role"
              value={role}
              onChange={(e) =>
                setRole(e.target.value as "member" | "admin" | "owner")
              }
              disabled={inviteMutation.isPending}
              className="mt-1.5 w-full rounded-lg border border-[#d8dad0] bg-white px-3.5 py-2.5 text-[14px] text-ink focus:border-ink focus:outline-none focus:ring-2 focus:ring-ink/10 disabled:opacity-50"
            >
              <option value="member">Member — Can review, upload, and comment</option>
              {currentUserRole === "owner" && (
                <>
                  <option value="admin">
                    Admin — Can manage projects and invite members
                  </option>
                  <option value="owner">Owner — Full administrative control</option>
                </>
              )}
            </select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={inviteMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={inviteMutation.isPending}
              className="flex items-center gap-2"
            >
              <UserPlus className="size-4" />
              {inviteMutation.isPending ? "Sending..." : "Send invitation"}
            </Button>
          </DialogFooter>
        </form>
      </DialogBody>
    </>
  );
}
