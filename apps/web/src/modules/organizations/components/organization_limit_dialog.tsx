"use client";

import type { OrganizationResponse } from "@feedio/api-client";
import { Check, ShieldAlert, Sparkles } from "lucide-react";
import React, { useState } from "react";

import { UpgradeModal } from "@/modules/billing";
import {
  Button,
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/modules/ui";

interface OrganizationLimitDialogProps {
  isOpen: boolean;
  onClose: () => void;
  ownedOrganization?: OrganizationResponse | null;
}

export function OrganizationLimitDialog({
  isOpen,
  onClose,
  ownedOrganization,
}: OrganizationLimitDialogProps) {
  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);

  const orgName = ownedOrganization?.name || "your existing workspace";
  const orgId = ownedOrganization?.id;
  const orgSlug = ownedOrganization?.slug || "";
  const planTier = ownedOrganization?.plan_tier || "free";

  return (
    <>
      <Dialog
        isOpen={isOpen && !isUpgradeOpen}
        onClose={onClose}
        size="md"
        ariaLabelledBy="org-limit-dialog-title"
        ariaDescribedBy="org-limit-dialog-desc"
      >
        <DialogCloseButton onClick={onClose} />
        <DialogHeader className="border-b border-line pb-4 pr-10">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-amber-500/10 text-amber-600 border border-amber-500/30">
              <ShieldAlert className="size-5" />
            </div>
            <div>
              <DialogTitle
                id="org-limit-dialog-title"
                className="text-[18px] md:text-[20px] font-bold text-ink"
              >
                Workspace Limit Reached
              </DialogTitle>
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-600">
                Free Plan Policy
              </span>
            </div>
          </div>
        </DialogHeader>

        <DialogBody className="space-y-5 pt-4">
          <DialogDescription id="org-limit-dialog-desc" className="text-sm text-ink leading-relaxed">
            Accounts on the <strong className="font-semibold text-ink">Free plan</strong> can own at most{" "}
            <strong className="font-semibold text-ink">1 organization</strong>. You are currently the owner of{" "}
            <span className="inline-block rounded-md bg-[#eef0e6] px-2 py-0.5 font-semibold text-ink border border-line">
              {orgName}
            </span>
            .
          </DialogDescription>

          <div className="rounded-xl border border-line bg-[#fbfbf7] p-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-ink mb-2.5">
              <Sparkles className="size-3.5 text-lime fill-lime" />
              <span>Upgrade to Pro ($5/month) to unlock:</span>
            </div>
            <ul className="space-y-2 text-xs text-muted">
              <li className="flex items-start gap-2">
                <Check className="size-4 shrink-0 text-ink mt-0.2" />
                <span>Create and own unlimited independent workspaces</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="size-4 shrink-0 text-ink mt-0.2" />
                <span>100 GB – 1 TB high-speed storage for RAW & 4K video</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="size-4 shrink-0 text-ink mt-0.2" />
                <span>Unlimited team members, clients, and reviewers with $0 per-seat fees</span>
              </li>
            </ul>
          </div>
        </DialogBody>

        <DialogFooter className="border-t border-line pt-4 gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              if (orgId) {
                setIsUpgradeOpen(true);
              } else {
                onClose();
              }
            }}
          >
            <Sparkles className="size-4" />
            <span>Upgrade Workspace to Pro</span>
          </Button>
        </DialogFooter>
      </Dialog>

      {orgId && (
        <UpgradeModal
          isOpen={isUpgradeOpen}
          onClose={() => {
            setIsUpgradeOpen(false);
            onClose();
          }}
          organizationId={orgId}
          organizationSlug={orgSlug}
          currentPlanTier={planTier}
          reason="organization_limit"
        />
      )}
    </>
  );
}
