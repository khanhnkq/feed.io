"use client";

import { ArrowRight, type LucideIcon } from "lucide-react";
import Link from "next/link";

export interface OrganizationFeature {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  actionLabel: string;
  meta: string;
  available: boolean;
}

interface OrganizationFeatureCardProps {
  feature: OrganizationFeature;
}

export function OrganizationFeatureCard({ feature }: OrganizationFeatureCardProps) {
  const { title, description, href, icon: Icon, actionLabel, meta, available } = feature;

  return available ? (
    <Link
      href={href}
      className="group flex flex-col justify-between rounded-xl border border-line bg-surface p-6 transition hover:-translate-y-1 hover:border-ink hover:shadow-[5px_5px_0_#d8ff43] focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-focus"
    >
      <div>
        <div className="flex items-center justify-between">
          <span className="grid size-10 place-items-center rounded-lg bg-lime font-mono text-xs font-bold text-ink">
            <Icon size={18} aria-hidden strokeWidth={2} />
          </span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
            {meta}
          </span>
        </div>
        <h2 className="mt-6 text-xl font-bold tracking-tight text-ink group-hover:text-black">
          {title}
        </h2>
        <p className="mt-2 text-xs text-muted leading-relaxed">
          {description}
        </p>
      </div>
      <footer className="mt-8 flex items-center justify-between border-t border-line pt-4 text-xs font-bold text-ink">
        <span>{actionLabel}</span>
        <ArrowRight size={16} className="transition group-hover:translate-x-1" />
      </footer>
    </Link>
  ) : (
    <div className="flex flex-col justify-between rounded-xl border border-line bg-[#f0f0ea] p-6 opacity-65 cursor-not-allowed">
      <div>
        <div className="flex items-center justify-between">
          <span className="grid size-10 place-items-center rounded-lg bg-lime font-mono text-xs font-bold text-ink">
            <Icon size={18} aria-hidden strokeWidth={2} />
          </span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
            {meta}
          </span>
        </div>
        <h2 className="mt-6 text-xl font-bold tracking-tight text-ink">
          {title}
        </h2>
        <p className="mt-2 text-xs text-muted leading-relaxed">
          {description}
        </p>
      </div>
      <footer className="mt-8 flex items-center justify-between border-t border-line pt-4 text-xs font-bold text-muted">
        <span>Coming soon</span>
        <small className="font-mono text-[8px] font-bold uppercase tracking-[.08em] text-[#777b70]">
          Soon
        </small>
      </footer>
    </div>
  );
}
