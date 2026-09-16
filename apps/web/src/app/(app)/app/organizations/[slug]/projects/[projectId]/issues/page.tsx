"use client";

import { useGetCurrentUser } from "@feedio/api-client";
import { useParams } from "next/navigation";
import React from "react";
import { useRealtimeProject } from "@/modules/collaboration";
import { ProjectIssuesScreen } from "@/modules/projects";
import { useOrganization } from "@/shared/providers/organization_context";

export default function ProjectIssuesPage() {
  const organization = useOrganization();
  const params = useParams();
  const projectId =
    typeof params?.projectId === "string" ? params.projectId : "";
  const { data: currentUser } = useGetCurrentUser();

  useRealtimeProject({
    projectId,
    organizationId: organization.id,
    userId: currentUser?.id,
    userName: currentUser?.display_name,
    userEmail: currentUser?.email,
    enabled: Boolean(projectId),
  });

  return (
    <ProjectIssuesScreen
      organizationId={organization.id}
      organizationSlug={organization.slug}
      projectId={projectId}
    />
  );
}
