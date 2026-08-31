"use client";

import { useGetMedia, useGetProject } from "@feedio/api-client";
import { AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import React from "react";
import { ReviewWorkspace } from "@/modules/review";
import { useOrganization } from "@/shared/providers/organization_context";

export default function MediaReviewPage() {
  const organization = useOrganization();
  const params = useParams();

  const slug = typeof params?.slug === "string" ? params.slug : organization?.slug || "";
  const projectId = typeof params?.projectId === "string" ? params.projectId : "";
  const mediaId = typeof params?.mediaId === "string" ? params.mediaId : "";

  const organizationId = organization?.id || "";

  const {
    data: media,
    isLoading: isMediaLoading,
    error: mediaError,
  } = useGetMedia(organizationId, projectId, mediaId, {
    query: {
      enabled: Boolean(organizationId && projectId && mediaId),
    },
  });

  const { data: project } = useGetProject(organizationId, projectId, {
    query: {
      enabled: Boolean(organizationId && projectId),
    },
  });

  if (isMediaLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-paper">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-8 animate-spin text-ink" />
          <p className="text-sm font-semibold text-ink">Loading media workspace...</p>
        </div>
      </div>
    );
  }

  if (mediaError || !media) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-paper">
        <div className="max-w-md text-center p-6 rounded-xl border border-line bg-surface/10">
          <AlertCircle className="mx-auto size-10 text-red-500 mb-3" />
          <h2 className="text-base font-bold text-ink">Media Asset Not Found</h2>
          <p className="mt-1 text-sm text-muted">
            The media asset you are trying to review could not be loaded or was removed.
          </p>
          <Link
            href={`/app/organizations/${slug}/projects/${projectId}`}
            className="mt-4 inline-flex items-center rounded-lg border border-ink bg-ink px-4 py-2 text-xs font-semibold text-paper hover:bg-ink/90"
          >
            Return to Project
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ReviewWorkspace
      organizationSlug={slug}
      organizationId={organizationId}
      projectId={projectId}
      projectName={project?.name || "Project"}
      initialMedia={media}
    />
  );
}
