"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  getListOrganizationsQueryKey,
  useCreateOrganization,
  useListOrganizations,
  type OrganizationResponse,
  type PaginatedResponseOrganizationResponse,
} from "@feedio/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Building2, Plus, ShieldAlert, Sparkles } from "lucide-react";

import { UpgradeModal } from "@/modules/billing";
import {
  Button,
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/modules/ui";
import { OrganizationLimitDialog } from "./organization_limit_dialog";

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
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isLimitModalOpen, setIsLimitModalOpen] = useState(false);

  const orgsQuery = useListOrganizations();
  const ownedFreeOrg = orgsQuery.data?.items?.find(
    (o) => (o.role === "owner" || !o.role) && (o.plan_tier === "free" || !o.plan_tier),
  );
  const firstFreeOrg = ownedFreeOrg || orgsQuery.data?.items?.find(
    (o) => o.plan_tier === "free",
  );
  const isOrgLimitError = Boolean(
    errorMessage?.toLowerCase().includes("only own 1 organization") ||
    errorMessage?.toLowerCase().includes("upgrade your current workspace") ||
    errorMessage?.toLowerCase().includes("free tier users"),
  );

  const createMutation = useCreateOrganization({
    mutation: {
      onSuccess: (organization) => {
        if (organization) {
          queryClient.setQueryData<PaginatedResponseOrganizationResponse | OrganizationResponse[]>(
            getListOrganizationsQueryKey(),
            (old) => {
              if (Array.isArray(old)) return [...old, organization];
              if (old?.items)
                return { ...old, items: [...old.items, organization] };
              return old;
            },
          );
        }
        onClose();
        router.push(`/app/organizations/${organization.slug}`);
      },
      onError: (error: unknown) => {
        const apiErr = error as {
          message?: string;
          status?: number;
          code?: string;
          response?: { data?: { detail?: string; message?: string } };
        };
        const detail =
          apiErr.response?.data?.detail ||
          apiErr.response?.data?.message ||
          apiErr.message;

        const isLimit =
          apiErr.status === 403 ||
          detail?.toLowerCase().includes("free tier") ||
          detail?.toLowerCase().includes("only own 1 organization") ||
          detail?.toLowerCase().includes("limit");

        if (isLimit) {
          setIsLimitModalOpen(true);
        }
        setErrorMessage(
          detail ?? "Failed to create organization. Please try again.",
        );
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
              This name identifies your organization for projects, reviews, and
              team members.
            </p>
          </div>

          {ownedFreeOrg && (
            <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50/70 p-3 text-[12px] text-amber-900">
              <ShieldAlert className="mt-0.5 size-4 shrink-0 text-amber-600" />
              <div className="flex-1">
                <span>
                  You currently own <strong className="font-semibold">{ownedFreeOrg.name}</strong> on the Free tier. Free tier accounts can own 1 organization.
                </span>
                <button
                  type="button"
                  onClick={() => setIsLimitModalOpen(true)}
                  className="mt-1 block font-semibold text-amber-700 underline hover:text-amber-800"
                >
                  Learn how to upgrade to Pro ($5/mo)
                </button>
              </div>
            </div>
          )}

          {errorMessage && (
            <div className="flex flex-col gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-[13px] text-red-800">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-600" />
                <span>{errorMessage}</span>
              </div>
              {isOrgLimitError && (
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  className="mt-1 w-full gap-1.5 self-start text-xs font-semibold"
                  onClick={() => {
                    setIsLimitModalOpen(true);
                  }}
                >
                  <Sparkles className="size-3.5" />
                  <span>Upgrade Workspace to Pro ($5/mo)</span>
                </Button>
              )}
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
            <Button type="submit" disabled={createMutation.isPending} size="sm">
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

      {firstFreeOrg && (
        <UpgradeModal
          isOpen={isUpgradeModalOpen}
          onClose={() => setIsUpgradeModalOpen(false)}
          organizationId={firstFreeOrg.id}
          organizationSlug={firstFreeOrg.slug}
          currentPlanTier={firstFreeOrg.plan_tier}
          reason="organization_limit"
        />
      )}

      <OrganizationLimitDialog
        isOpen={isLimitModalOpen}
        onClose={() => {
          setIsLimitModalOpen(false);
        }}
        ownedOrganization={firstFreeOrg}
      />
    </div>
  );
}
