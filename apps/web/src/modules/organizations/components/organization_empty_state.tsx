"use client";

import { Building2, Plus } from "lucide-react";

import { Button } from "@/modules/ui";

interface OrganizationEmptyStateProps {
  onCreateOrganization?: () => void;
}

export function OrganizationEmptyState({
  onCreateOrganization,
}: OrganizationEmptyStateProps) {
  return (
    <section className="mt-12 rounded-xl border border-line bg-surface p-12 text-center">
      <div className="mx-auto mb-4 grid size-12 place-items-center rounded-xl bg-lime text-ink">
        <Building2 className="size-6" strokeWidth={2} />
      </div>
      <h2 className="mt-4 text-xl font-bold">No organizations found</h2>
      <p className="mt-2 text-sm text-muted">
        Get started by creating your first agency organization.
      </p>
      {onCreateOrganization ? (
        <Button
          className="mt-6"
          type="button"
          onClick={onCreateOrganization}
          size="sm"
          variant="primary"
        >
          <Plus size={15} /> Create organization
        </Button>
      ) : (
        <Button className="mt-6" href="/onboarding" size="sm" variant="primary">
          <Plus size={15} /> Create organization
        </Button>
      )}
    </section>
  );
}
