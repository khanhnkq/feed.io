"use client";

import { Building2, Plus } from "lucide-react";

import { Button } from "@/modules/ui";

export function OrganizationEmptyState() {
  return (
    <section className="mt-12 rounded-xl border border-line bg-surface p-12 text-center">
      <Building2 className="mx-auto text-muted" size={40} />
      <h2 className="mt-4 text-xl font-bold">No organizations found</h2>
      <p className="mt-2 text-sm text-muted">
        Get started by creating your first agency organization.
      </p>
      <Button className="mt-6" href="/onboarding" size="sm" variant="primary">
        <Plus size={15} /> Create organization
      </Button>
    </section>
  );
}
