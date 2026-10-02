"use client";

import { useListProjects } from "@feedio/api-client";
import { Film, FolderKanban, Pencil, Trash2, Users } from "lucide-react";
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
      title: "Members",
      description: "Invite members and manage organization access.",
      href: `/app/organizations/${organization.slug}/members`,
      icon: Users,
      actionLabel: "Manage members",
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
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="m-0 text-[clamp(44px,6vw,76px)] font-bold leading-[.95] tracking-[-.065em]">
              {organization.name}
            </h1>
            {organization.role === "owner" ? (
              <span className="inline-flex items-center rounded-full bg-lime/25 px-3 py-1 text-xs font-bold text-ink border border-lime/50 uppercase tracking-wider">
                Owner
              </span>
            ) : organization.role === "admin" ? (
              <span className="inline-flex items-center rounded-full bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-700 border border-blue-500/30 uppercase tracking-wider">
                Admin
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-surface px-3 py-1 text-xs font-semibold text-muted border border-line uppercase tracking-wider">
                Member
              </span>
            )}
            {organization.plan_tier && organization.plan_tier !== "free" ? (
              <span className="inline-flex items-center rounded-full bg-[#161813] px-2.5 py-1 text-xs font-bold text-lime uppercase tracking-wider">
                PRO
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-[#f0f1ea] px-2.5 py-1 text-xs font-mono uppercase text-muted border border-line">
                FREE
              </span>
            )}
          </div>
          <p className="mt-5 max-w-2xl text-[15px] leading-7 text-muted">
            Your organization is ready. Manage projects, media assets and
            client review spaces below.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsEditOpen(true)}
          >
            <Pencil size={15} /> Edit organization
          </Button>
          {organization.role === "owner" && (
            <Button
              type="button"
              variant="outline"
              className="text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
              onClick={() => setIsDeleteOpen(true)}
            >
              <Trash2 size={15} /> Delete organization
            </Button>
          )}
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
