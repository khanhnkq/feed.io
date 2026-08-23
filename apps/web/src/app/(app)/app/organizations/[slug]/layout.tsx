"use client";

import {
  useGetCurrentUser,
  useGetOrganizationBySlug,
  useListProjects,
} from "@feedio/api-client";
import { useParams } from "next/navigation";
import type { ReactNode } from "react";

import { AppShell } from "@/modules/navigation";
import { OrganizationProvider } from "@/shared/providers/organization_context";

export default function OrganizationLayout({ children }: { children: ReactNode }) {
  const params = useParams();
  const slug = typeof params?.slug === "string" ? params.slug : "";
  const projectId = typeof params?.projectId === "string" ? params.projectId : "";
  const currentUser = useGetCurrentUser();
  const organizationQuery = useGetOrganizationBySlug(slug, {
    query: { enabled: Boolean(slug), retry: false },
  });
  const organizationId = organizationQuery.data?.id ?? "";
  const projectsQuery = useListProjects(organizationId, {
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
      <main className="grid min-h-screen place-items-center bg-paper p-8 text-center text-sm text-muted">
        Organization not found or access denied.
      </main>
    );
  }

  const project = projectId ? projectsQuery.data?.find((p) => p.id === projectId) : undefined;
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
