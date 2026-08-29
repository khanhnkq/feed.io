"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  getGetCurrentUserQueryKey,
  getListOrganizationsQueryKey,
  useCreateOrganization,
} from "@feedio/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Building2, Plus } from "lucide-react";

import {
  Button,
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/modules/ui";

interface CreateOrganizationDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateOrganizationDialog({
  isOpen,
  onClose,
}: CreateOrganizationDialogProps) {
  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      ariaLabelledBy="create-org-dialog-title"
      size="md"
    >
      <CreateOrganizationForm onClose={onClose} />
    </Dialog>
  );
}

function CreateOrganizationForm({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const createMutation = useCreateOrganization({
    mutation: {
      onSuccess: async (organization) => {
        await queryClient.invalidateQueries({
          queryKey: getGetCurrentUserQueryKey(),
        });
        await queryClient.invalidateQueries({
          queryKey: getListOrganizationsQueryKey(),
        });
        onClose();
        router.push(`/app/organizations/${organization.slug}`);
      },
      onError: (error: unknown) => {
        const err = error as { response?: { data?: { detail?: string } } };
        const detail = err.response?.data?.detail;
        setErrorMessage(detail ?? "Failed to create organization. Please try again.");
      },
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage("Please enter an organization name.");
      return;
    }
    setErrorMessage(null);
    createMutation.mutate({ data: { name: name.trim() } });
  };

  return (
    <div>
      <DialogCloseButton
        onClick={onClose}
        disabled={createMutation.isPending}
      />
      <DialogHeader className="border-b border-line pb-4 pr-10">
        <div className="flex items-center gap-2.5">
          <div className="grid size-8 place-items-center rounded-lg bg-lime text-ink">
            <Building2 className="size-4" strokeWidth={2} />
          </div>
          <DialogTitle
            id="create-org-dialog-title"
            className="text-[18px] md:text-[20px]"
          >
            Create New Organization
          </DialogTitle>
        </div>
      </DialogHeader>

      <DialogBody>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="org-name-input"
              className="block font-mono text-[11px] font-bold uppercase tracking-wider text-muted"
            >
              Organization Name
            </label>
            <input
              id="org-name-input"
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme Creative, Studio North"
              className="mt-1.5 w-full rounded-lg border border-line bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/60 focus:border-ink focus:outline-none focus:ring-1 focus:ring-ink"
            />
            <p className="mt-1.5 text-[12px] text-muted">
              This name identifies your workspace for projects, reviews, and team members.
            </p>
          </div>

          {errorMessage && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-[13px] text-red-700">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              size="sm"
              disabled={createMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending}
              size="sm"
            >
              {createMutation.isPending ? (
                "Creating…"
              ) : (
                <>
                  <Plus className="size-4" />
                  Create Organization
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogBody>
    </div>
  );
}
