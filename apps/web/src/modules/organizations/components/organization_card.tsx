"use client";

import type { OrganizationResponse } from "@feedio/api-client";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

interface OrganizationCardProps {
  organization: OrganizationResponse;
  index: number;
}

export function OrganizationCard({ organization, index }: OrganizationCardProps) {
  return (
    <Link
      href={`/app/organizations/${organization.slug}`}
      className="group flex flex-col justify-between rounded-xl border border-line bg-surface p-6 transition hover:-translate-y-1 hover:border-ink hover:shadow-[5px_5px_0_#d8ff43] focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-focus"
    >
      <div>
        <div className="flex items-center justify-between">
          <span className="grid size-10 place-items-center rounded-lg bg-lime font-mono text-xs font-bold text-ink">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
            {organization.slug}
          </span>
        </div>
        <h2 className="mt-6 text-xl font-bold tracking-tight text-ink group-hover:text-black">
          {organization.name}
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
  );
}
