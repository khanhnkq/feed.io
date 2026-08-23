"use client";

import { useListOrganizations } from "@feedio/api-client";
import { Plus } from "lucide-react";
import Link from "next/link";

import { OrganizationCard } from "./organization_card";
import { OrganizationEmptyState } from "./organization_empty_state";

export function GlobalDashboardScreen() {
  const organizationsQuery = useListOrganizations({ query: { retry: false } });
  const organizations = organizationsQuery.data ?? [];

  return (
    <main
      id="main-content"
      className="mx-auto max-w-[1500px] px-5 pb-[60px] pt-[38px] md:px-[42px] md:pb-[72px] md:pt-[54px]"
    >
      <section className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="mt-2 text-[clamp(36px,5vw,60px)] font-bold leading-[.96] tracking-[-.055em]">
            Your Organizations
          </h1>
          <p className="mt-3 text-sm text-muted">
            Select an organization to manage projects, review video assets and
            collaborate with your team.
          </p>
        </div>
        <Link
          href="/onboarding"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-ink bg-ink px-4 text-[13px] font-bold text-white shadow-[3px_3px_0_#d8ff43] transition hover:-translate-x-px hover:-translate-y-px hover:shadow-[5px_5px_0_#d8ff43] focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-focus"
        >
          <Plus size={16} /> New organization
        </Link>
      </section>

      {organizationsQuery.isPending ? (
        <p className="mt-12 animate-pulse text-sm text-muted">
          Loading organizations…
        </p>
      ) : organizations.length === 0 ? (
        <OrganizationEmptyState />
      ) : (
        <section
          className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          aria-label="Organization list"
        >
          {organizations.map((org, index) => (
            <OrganizationCard key={org.id} organization={org} index={index} />
          ))}
        </section>
      )}
    </main>
  );
}
