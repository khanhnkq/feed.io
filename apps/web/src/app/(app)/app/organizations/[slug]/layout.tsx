"use client";

import {
  useGetCurrentUser,
  useGetOrganizationBySlug,
  useListProjects,
} from "@feedio/api-client";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";

import { AppShell } from "@/modules/navigation";
import { Button } from "@/modules/ui";
import { OrganizationProvider } from "@/shared/providers/organization_context";

export default function OrganizationLayout({
  children,
}: {
  children: ReactNode;
}) {
  const params = useParams();
  const slug = typeof params?.slug === "string" ? params.slug : "";
  const projectId =
    typeof params?.projectId === "string" ? params.projectId : "";
  const currentUser = useGetCurrentUser();
  const organizationQuery = useGetOrganizationBySlug(slug, {
    query: { enabled: Boolean(slug), retry: false },
  });
  const organizationId = organizationQuery.data?.id ?? "";
  const projectsQuery = useListProjects(organizationId, undefined, {
    query: { enabled: Boolean(organizationId && projectId), retry: false },
  });

  if (currentUser.isPending || organizationQuery.isPending) {
    return (
      <main className="grid min-h-screen place-items-center bg-paper text-sm text-muted">
        Loading organization…
      </main>
    );
  }

  if (!currentUser.data || !organizationQuery.data) {
    return (
      <main className="grid min-h-screen place-items-center content-center gap-4 bg-paper p-8 text-center">
        <span className="font-mono text-[56px] font-bold leading-none tracking-[-.06em] text-[#c5c7bd]">
          404
        </span>
        <h1 className="text-xl font-bold text-ink">Organization not found</h1>
        <p className="max-w-md text-sm text-muted">
          The organization you are looking for does not exist, or you do not
          have permission to view it.
        </p>
        <Button className="mt-4" href="/app" size="sm" variant="primary">
          Back to organizations
        </Button>
      </main>
    );
  }

  const project = projectId
    ? projectsQuery.data?.items.find((p) => p.id === projectId)
    : undefined;
  const isProjectContext = Boolean(projectId);

  return (
    <OrganizationProvider organization={organizationQuery.data}>
      <AppShell
        context={isProjectContext ? "project" : "organization"}
        organization={organizationQuery.data}
        projectName={project?.name}
        projectId={projectId}
        user={currentUser.data}
      >
        {children}
      </AppShell>
    </OrganizationProvider>
  );
}
