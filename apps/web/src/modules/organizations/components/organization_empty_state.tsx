"use client";

import { Building2, Plus } from "lucide-react";
import Link from "next/link";

export function OrganizationEmptyState() {
  return (
    <section className="mt-12 rounded-xl border border-line bg-surface p-12 text-center">
      <Building2 className="mx-auto text-muted" size={40} />
      <h2 className="mt-4 text-xl font-bold">No organizations found</h2>
      <p className="mt-2 text-sm text-muted">
        Get started by creating your first agency organization.
      </p>
      <Link
        href="/onboarding"
        className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg bg-ink px-5 text-xs font-bold text-white shadow-[3px_3px_0_#d8ff43]"
      >
        <Plus size={15} /> Create organization
      </Link>
    </section>
  );
}
