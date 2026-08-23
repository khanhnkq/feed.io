"use client";

import { useListProjects } from "@feedio/api-client";
import { ArrowRight, CheckCircle2, Film, FolderKanban, Users } from "lucide-react";
import Link from "next/link";

import { useOrganization } from "@/shared/providers/organization_context";

export function OrganizationDashboardScreen() {
  const organization = useOrganization();
  const projects = useListProjects(organization.id, { query: { retry: false } });
  const projectCount = projects.data?.length;

  const cards = [
    {
      title: "Projects",
      description: "Create review spaces for campaigns, films and client deliverables.",
      href: `/app/organizations/${organization.slug}/projects`,
      icon: FolderKanban,
      available: true,
    },
    {
      title: "Team",
      description: "Invite collaborators and define organization access.",
      href: `/app/organizations/${organization.slug}/team`,
      icon: Users,
      available: false,
    },
    {
      title: "Reviews",
      description: "Track media feedback and approval activity across projects.",
      href: `/app/organizations/${organization.slug}/reviews`,
      icon: Film,
      available: false,
    },
  ];

  return (
    <main id="main-content" className="mx-auto max-w-[1500px] px-5 pb-[60px] pt-[38px] md:px-[42px] md:pb-[72px] md:pt-[54px]">
      <section className="max-w-4xl">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#b9c978] bg-[#f5ffd2] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[.1em] text-[#3f4c15]">
          <CheckCircle2 size={14} /> Organization active
        </div>
        <h1 className="m-0 text-[clamp(44px,6vw,76px)] font-bold leading-[.95] tracking-[-.065em]">
          {organization.name}
        </h1>
        <p className="mt-5 max-w-2xl text-[15px] leading-7 text-muted">
          Your agency organization is ready. Manage projects, media assets and client review spaces below.
        </p>
      </section>

      <section className="mt-12 grid gap-[18px] border-t border-line pt-[18px] md:grid-cols-3" aria-label="Organization areas">
        {cards.map(({ title, description, href, icon: Icon, available }) => {
          const content = (
            <>
              <span className="grid size-11 place-items-center rounded-[10px_4px_10px_4px] bg-lime text-ink">
                <Icon size={20} aria-hidden />
              </span>
              <span className="mt-8 flex items-end justify-between gap-4">
                <span>
                  <strong className="block text-xl tracking-[-.03em]">{title}</strong>
                  <span className="mt-2 block text-sm leading-6 text-muted">{description}</span>
                </span>
                {available ? <ArrowRight className="shrink-0" size={20} aria-hidden /> : null}
              </span>
              <span className="mt-8 block font-mono text-[10px] font-bold uppercase tracking-[.08em] text-muted">
                {title === "Projects" && projectCount !== undefined
                  ? `${projectCount} ${projectCount === 1 ? "project" : "projects"}`
                  : available
                    ? "Open area"
                    : "Coming soon"}
              </span>
            </>
          );

          return available ? (
            <Link
              className="min-h-[280px] rounded-xl border border-line bg-surface p-6 transition hover:-translate-y-1 hover:border-ink hover:shadow-[5px_5px_0_#d8ff43] focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-focus"
              href={href}
              key={title}
            >
              {content}
            </Link>
          ) : (
            <div className="min-h-[280px] rounded-xl border border-line bg-[#f0f0ea] p-6 opacity-65" key={title}>
              {content}
            </div>
          );
        })}
      </section>
    </main>
  );
}
