"use client";

import { useListProjects } from "@feedio/api-client";
import { Film, FolderKanban, Pencil, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

import { Button } from "@/modules/ui";
import { useOrganization } from "@/shared/providers/organization_context";
import { DeleteOrganizationDialog } from "./delete_organization_dialog";
import { EditOrganizationDialog } from "./edit_organization_dialog";
import {
  type OrganizationFeature,
  OrganizationFeatureCard,
} from "./organization_feature_card";

export function OrganizationDashboardScreen() {
  const organization = useOrganization();
  const router = useRouter();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  const projects = useListProjects(organization.id, undefined, {
    query: { retry: false },
  });
  const projectCount = projects.data?.items.length;

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
      available: true,
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
      <section className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="max-w-4xl">
          <h1 className="m-0 text-[clamp(44px,6vw,76px)] font-bold leading-[.95] tracking-[-.065em]">
            {organization.name}
          </h1>
          <p className="mt-5 max-w-2xl text-[15px] leading-7 text-muted">
            Your agency organization is ready. Manage projects, media assets and
            client review spaces below.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsEditOpen(true)}
          >
            <Pencil size={15} /> Edit organization
          </Button>
        </div>
      </section>

      <section
        className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        aria-label="Organization areas"
      >
        {features.map((feature) => (
          <OrganizationFeatureCard key={feature.title} feature={feature} />
        ))}
      </section>

      <EditOrganizationDialog
        organization={organization}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onUpdated={(updated) => {
          if (updated.slug !== organization.slug) {
            router.push(`/app/organizations/${updated.slug}`);
          }
        }}
      />

      <DeleteOrganizationDialog
        organization={organization}
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onDeleted={() => {
          router.push("/app");
        }}
      />
    </main>
  );
}
