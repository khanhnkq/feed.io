"use client";

import { useListProjects } from "@feedio/api-client";
import { Film, FolderKanban, Users } from "lucide-react";

import { useOrganization } from "@/shared/providers/organization_context";
import {
  type OrganizationFeature,
  OrganizationFeatureCard,
} from "./organization_feature_card";

export function OrganizationDashboardScreen() {
  const organization = useOrganization();
  const projects = useListProjects(organization.id, {
    query: { retry: false },
  });
  const projectCount = projects.data?.length;

  const features: OrganizationFeature[] = [
    {
      title: "Projects",
      description:
        "Create review spaces for campaigns, films and client deliverables.",
      href: `/app/organizations/${organization.slug}/projects`,
      icon: FolderKanban,
      actionLabel: "Open projects",
      meta:
        projectCount !== undefined
          ? `${projectCount} ${projectCount === 1 ? "project" : "projects"}`
          : "PROJECTS",
      available: true,
    },
    {
      title: "Team",
      description: "Invite collaborators and define organization access.",
      href: `/app/organizations/${organization.slug}/team`,
      icon: Users,
      actionLabel: "Manage team",
      meta: "ACCESS CONTROL",
      available: false,
    },
    {
      title: "Reviews",
      description:
        "Track media feedback and approval activity across projects.",
      href: `/app/organizations/${organization.slug}/reviews`,
      icon: Film,
      actionLabel: "View reviews",
      meta: "COLLABORATION",
      available: false,
    },
  ];

  return (
    <main
      id="main-content"
      className="mx-auto max-w-[1500px] px-5 pb-[60px] pt-[38px] md:px-[42px] md:pb-[72px] md:pt-[54px]"
    >
      <section className="max-w-4xl">
        <h1 className="m-0 text-[clamp(44px,6vw,76px)] font-bold leading-[.95] tracking-[-.065em]">
          {organization.name}
        </h1>
        <p className="mt-5 max-w-2xl text-[15px] leading-7 text-muted">
          Your agency organization is ready. Manage projects, media assets and
          client review spaces below.
        </p>
      </section>

      <section
        className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        aria-label="Organization areas"
      >
        {features.map((feature) => (
          <OrganizationFeatureCard key={feature.title} feature={feature} />
        ))}
      </section>
    </main>
  );
}
