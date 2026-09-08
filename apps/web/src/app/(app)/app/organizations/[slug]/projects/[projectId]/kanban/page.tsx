"use client";

import type { MediaResponse } from "@feedio/api-client";
import {
  useCreateMediaDecision,
  useGetProject,
  useListMedia,
} from "@feedio/api-client";
import {
  ChevronRight,
  Film,
  FolderKanban,
  Home,
  Upload,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import {
  DeleteMediaDialog,
  EditMediaDialog,
  MediaKanbanBoard,
  type ReviewStatus,
  MoveMediaDialog,
  UploadMediaDialog,
} from "@/modules/media";
import { ProjectMembersDialog } from "@/modules/projects";
import { Button } from "@/modules/ui";
import { useOrganization } from "@/shared/providers/organization_context";

export default function ProjectKanbanPage() {
  const router = useRouter();
  const organization = useOrganization();
  const params = useParams();
  const queryClient = useQueryClient();

  const projectId =
    typeof params?.projectId === "string" ? params.projectId : "";

  const [search, setSearch] = useState("");
  const [uploadMediaOpen, setUploadMediaOpen] = useState(false);
  const [editingMedia, setEditingMedia] = useState<MediaResponse | null>(null);
  const [movingMedia, setMovingMedia] = useState<MediaResponse | null>(null);
  const [deleteMediaItem, setDeleteMediaItem] = useState<MediaResponse | null>(
    null,
  );
  const [projectMembersOpen, setProjectMembersOpen] = useState(false);

  const projectQuery = useGetProject(organization.id, projectId, {
    query: { enabled: Boolean(projectId) },
  });
  const project = projectQuery.data;

  const mediaQuery = useListMedia(organization.id, projectId, undefined, {
    query: {
      refetchInterval: (query) => {
        const list = (
          query.state.data as { items?: MediaResponse[] } | undefined
        )?.items;
        return list?.some(
          (m) => m.status === "processing" || m.status === "uploading",
        )
          ? 3000
          : false;
      },
    },
  });

  const mediaList = useMemo(
    () => mediaQuery.data?.items || [],
    [mediaQuery.data],
  );

  const visibleMedia = useMemo(() => {
    if (!search.trim()) return mediaList;
    const q = search.toLowerCase();
    return mediaList.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        m.filename.toLowerCase().includes(q),
    );
  }, [mediaList, search]);

  const createDecisionMutation = useCreateMediaDecision({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: [
            `/api/v1/organizations/${organization.id}/projects/${projectId}/media`,
          ],
        });
      },
    },
  });

  const handleStatusChange = (mediaId: string, newStatus: ReviewStatus) => {
    createDecisionMutation.mutate({
      organizationId: organization.id,
      projectId,
      mediaId,
      data: {
        status: newStatus,
      },
    });
  };

  const handleOpenReview = (media: MediaResponse) => {
    router.push(
      `/app/organizations/${organization.slug}/projects/${projectId}/media/${media.id}`,
    );
  };

  if (projectQuery.isPending) {
    return (
      <main
        id="main-content"
        className="mx-auto max-w-[1500px] px-5 pb-[60px] pt-[38px] md:px-[42px] md:pb-[72px] md:pt-[54px]"
      >
        <div className="grid min-h-60 place-items-center text-sm text-muted">
          Loading project…
        </div>
      </main>
    );
  }

  if (!project) {
    return (
      <main
        id="main-content"
        className="mx-auto max-w-[1500px] px-5 pb-[60px] pt-[38px] md:px-[42px] md:pb-[72px] md:pt-[54px]"
      >
        <section className="mt-8 rounded-xl border border-dashed border-[#c7c9bf] bg-surface p-12 text-center text-muted">
          <span className="font-mono text-[54px] font-bold leading-[.9] tracking-[-.08em] text-[#c5c7bd]">
            404
          </span>
          <h2 className="my-3 text-xl font-bold text-ink">Project not found</h2>
          <p className="m-0 text-sm">
            The project you are looking for does not exist or you do not have
            permission to access it.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main
      id="main-content"
      className="mx-auto max-w-[1500px] px-5 pb-[60px] pt-[38px] md:px-[42px] md:pb-[72px] md:pt-[54px]"
    >
      {/* Header & Breadcrumb */}
      <section className="flex flex-col gap-4 border-b border-line pb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <nav
            aria-label="Breadcrumb"
            className="flex flex-wrap items-center gap-1.5 text-[13px] text-muted"
          >
            <Link
              href={`/app/organizations/${organization.slug}/projects`}
              className="flex items-center gap-1 font-medium transition hover:text-ink"
            >
              <Home size={14} />
              <span>Projects</span>
            </Link>
            <ChevronRight size={13} className="text-muted/60" />
            <Link
              href={`/app/organizations/${organization.slug}/projects/${projectId}`}
              className="font-medium transition hover:text-ink"
            >
              {project.name}
            </Link>
            <ChevronRight size={13} className="text-muted/60" />
            <span className="flex items-center gap-1 font-semibold text-ink">
              Review Progress
            </span>
          </nav>

          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <h1 className="text-[28px] font-bold tracking-tight text-ink md:text-[34px]">
              Review Progress
            </h1>
          </div>
          <p className="mt-1 text-sm text-muted">
            Track approval stages, manage team feedback, and drag assets across
            review statuses.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              router.push(
                `/app/organizations/${organization.slug}/projects/${projectId}`,
              )
            }
          >
            <Film size={15} />
            Media & Assets
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setProjectMembersOpen(true)}
          >
            <Users size={15} />
            Access
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setUploadMediaOpen(true)}
          >
            <Upload size={15} />
            Upload media
          </Button>
        </div>
      </section>

      {/* Kanban Board */}
      {mediaList.length > 0 ? (
        <section className="mt-4">
          <MediaKanbanBoard
            mediaList={visibleMedia}
            onOpenReview={handleOpenReview}
            onStatusChange={handleStatusChange}
            onEdit={(m) => setEditingMedia(m)}
            onMove={(m) => setMovingMedia(m)}
            onDelete={(m) => setDeleteMediaItem(m)}
            onUploadClick={() => setUploadMediaOpen(true)}
            isLoading={mediaQuery.isPending}
            disabled={createDecisionMutation.isPending}
          />
        </section>
      ) : !mediaQuery.isPending ? (
        <section className="mt-10 rounded-xl border border-dashed border-[#c7c9bf] bg-surface p-12 text-center">
          <FolderKanban className="mx-auto text-muted" size={40} />
          <h2 className="mt-4 text-lg font-bold text-ink">
            No media assets in review yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Upload video cuts, image keyframes, or audio tracks to start
            tracking approval statuses on the Kanban board.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setUploadMediaOpen(true)}
            >
              <Upload size={15} />
              Upload media
            </Button>
          </div>
        </section>
      ) : null}

      {/* Dialogs */}
      <UploadMediaDialog
        open={uploadMediaOpen}
        onOpenChange={setUploadMediaOpen}
        organizationId={organization.id}
        projectId={project.id}
      />

      <EditMediaDialog
        open={Boolean(editingMedia)}
        onOpenChange={(open) => !open && setEditingMedia(null)}
        organizationId={organization.id}
        projectId={project.id}
        media={editingMedia}
      />

      <MoveMediaDialog
        open={Boolean(movingMedia)}
        onOpenChange={(open) => !open && setMovingMedia(null)}
        organizationId={organization.id}
        projectId={project.id}
        media={movingMedia}
      />

      <DeleteMediaDialog
        isOpen={Boolean(deleteMediaItem)}
        onClose={() => setDeleteMediaItem(null)}
        organizationId={organization.id}
        projectId={project.id}
        media={deleteMediaItem}
      />

      <ProjectMembersDialog
        project={project}
        isOpen={projectMembersOpen}
        onClose={() => setProjectMembersOpen(false)}
      />
    </main>
  );
}
