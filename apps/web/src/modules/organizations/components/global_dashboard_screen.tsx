"use client";

import { useListOrganizations } from "@feedio/api-client";
import { ArrowRight, Building2, Plus } from "lucide-react";
import Link from "next/link";

export function GlobalDashboardScreen() {
  const organizationsQuery = useListOrganizations({ query: { retry: false } });
  const organizations = organizationsQuery.data ?? [];

  return (
    <main id="main-content" className="mx-auto max-w-[1500px] px-5 pb-[60px] pt-[38px] md:px-[42px] md:pb-[72px] md:pt-[54px]">
      <section className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="font-mono text-[11px] font-bold uppercase tracking-[.14em] text-muted">
            GLOBAL DASHBOARD
          </span>
          <h1 className="mt-2 text-[clamp(36px,5vw,60px)] font-bold leading-[.96] tracking-[-.055em]">
            Your Organizations
          </h1>
          <p className="mt-3 text-sm text-muted">
            Select an organization to manage projects, review video assets and collaborate with your team.
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
        <p className="mt-12 animate-pulse text-sm text-muted">Loading organizations…</p>
      ) : organizations.length === 0 ? (
        <section className="mt-12 rounded-xl border border-line bg-surface p-12 text-center">
          <Building2 className="mx-auto text-muted" size={40} />
          <h2 className="mt-4 text-xl font-bold">No organizations found</h2>
          <p className="mt-2 text-sm text-muted">Get started by creating your first agency organization.</p>
          <Link
            href="/onboarding"
            className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg bg-ink px-5 text-xs font-bold text-white shadow-[3px_3px_0_#d8ff43]"
          >
            <Plus size={15} /> Create organization
          </Link>
        </section>
      ) : (
        <section className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-label="Organization list">
          {organizations.map((org, index) => (
            <Link
              key={org.id}
              href={`/app/organizations/${org.slug}`}
              className="group flex flex-col justify-between rounded-xl border border-line bg-surface p-6 transition hover:-translate-y-1 hover:border-ink hover:shadow-[5px_5px_0_#d8ff43] focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-focus"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="grid size-10 place-items-center rounded-lg bg-lime font-mono text-xs font-bold text-ink">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
                    {org.slug}
                  </span>
                </div>
                <h2 className="mt-6 text-xl font-bold tracking-tight text-ink group-hover:text-black">
                  {org.name}
                </h2>
                <p className="mt-2 text-xs text-muted">
                  Open organization to review media and manage projects.
                </p>
              </div>
              <footer className="mt-8 flex items-center justify-between border-t border-line pt-4 text-xs font-bold text-ink">
                <span>Open organization</span>
                <ArrowRight size={16} className="transition group-hover:translate-x-1" />
              </footer>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}
