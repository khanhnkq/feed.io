"use client";

import type { BreadcrumbItemResponse, FolderResponse, MediaResponse } from "@feedio/api-client";
import {
  useGetFolderBreadcrumbs,
  useGetProject,
  useListFolders,
  useListMedia,
  useRetryMediaTranscode,
} from "@feedio/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { Film, FolderPlus, Upload } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import {
  DeleteMediaDialog,
  EditMediaDialog,
  MediaCard,
  MediaTableView,
  MediaViewerModal,
  MoveMediaDialog,
  TranscodingToast,
  UploadMediaDialog,
} from "@/modules/media";
import {
  CreateFolderDialog,
  DeleteFolderDialog,
  DeleteProjectDialog,
  EditProjectDialog,
  filterFolders,
  FolderCard,
  FolderFilterBar,
  FolderTableView,
  MoveFolderDialog,
  ProjectMembersDialog,
  ProjectPageHeader,
  RenameFolderDialog,
  sortFolders,
  type SortOption,
  type ViewMode,
} from "@/modules/projects";
import { Button } from "@/modules/ui";
import { useOrganization } from "@/shared/providers/organization_context";

export default function ProjectDashboardPage() {
  const router = useRouter();
  const organization = useOrganization();
  const params = useParams();
  const searchParams = useSearchParams();

  const projectId = typeof params?.projectId === "string" ? params.projectId : "";
  const currentFolderId = searchParams.get("folderId");

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [renameFolder, setRenameFolder] = useState<FolderResponse | null>(null);
  const [moveFolder, setMoveFolder] = useState<FolderResponse | null>(null);
  const [deleteFolder, setDeleteFolder] = useState<FolderResponse | null>(null);
  const [editProjectOpen, setEditProjectOpen] = useState(false);
  const [deleteProjectOpen, setDeleteProjectOpen] = useState(false);
  const [projectMembersOpen, setProjectMembersOpen] = useState(false);

  // Media state
  const [uploadMediaOpen, setUploadMediaOpen] = useState(false);
  const [playingMediaId, setPlayingMediaId] = useState<string | null>(null);
  const [editingMedia, setEditingMedia] = useState<MediaResponse | null>(null);
  const [movingMedia, setMovingMedia] = useState<MediaResponse | null>(null);
  const [deleteMediaItem, setDeleteMediaItem] = useState<MediaResponse | null>(null);

  const [folderSearch, setFolderSearch] = useState("");
  const [folderSort, setFolderSort] = useState<SortOption>("name_asc");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const projectQuery = useGetProject(organization.id, projectId, {
    query: { enabled: !!projectId },
  });
  const project = projectQuery.data;

  const foldersQuery = useListFolders(
    organization.id,
    projectId,
    currentFolderId ? { parent_id: currentFolderId } : undefined,
  );

  const mediaQuery = useListMedia(
    organization.id,
    projectId,
    currentFolderId ? { folder_id: currentFolderId } : undefined,
    {
      query: {
        refetchInterval: (query) => {
          const list = (query.state.data as { items?: MediaResponse[] } | undefined)?.items;
          return list?.some((m) => m.status === "processing" || m.status === "uploading")
            ? 3000
            : false;
        },
      },
    },
  );

  const breadcrumbsQuery = useGetFolderBreadcrumbs(
    organization.id,
    projectId,
    currentFolderId || "",
    {
      query: {
        enabled: Boolean(currentFolderId),
      },
    },
  );

  const folders = useMemo(() => foldersQuery.data?.items || [], [foldersQuery.data]);
  const mediaList = useMemo(() => mediaQuery.data?.items || [], [mediaQuery.data]);
  const breadcrumbs: BreadcrumbItemResponse[] = useMemo(
    () => (currentFolderId && breadcrumbsQuery.data ? breadcrumbsQuery.data : []),
    [currentFolderId, breadcrumbsQuery.data],
  );

  const currentFolderName = useMemo(() => {
    if (!currentFolderId) return null;
    const current = breadcrumbs.find((b: BreadcrumbItemResponse) => b.id === currentFolderId);
    return current?.name || null;
  }, [currentFolderId, breadcrumbs]);

  const visibleFolders = useMemo(
    () => sortFolders(filterFolders(folders, folderSearch), folderSort),
    [folders, folderSearch, folderSort],
  );

  const visibleMedia = useMemo(() => {
    if (!folderSearch.trim()) return mediaList;
    const query = folderSearch.toLowerCase();
    return mediaList.filter(
      (m) =>
        m.title.toLowerCase().includes(query) ||
        m.filename.toLowerCase().includes(query),
    );
  }, [mediaList, folderSearch]);

  const queryClient = useQueryClient();
  const retryTranscodeMutation = useRetryMediaTranscode({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [`/api/v1/organizations/${organization.id}/projects/${projectId}/media`] });
      },
    },
  });

  const handleRetryTranscode = (media: MediaResponse) => {
    retryTranscodeMutation.mutate({
      organizationId: organization.id,
      projectId,
      mediaId: media.id,
    });
  };

  const handleNavigateToRoot = () => {
    router.push(`/app/organizations/${organization.slug}/projects/${projectId}`);
  };

  const handleNavigateToFolder = (folderId: string) => {
    router.push(
      `/app/organizations/${organization.slug}/projects/${projectId}?folderId=${folderId}`,
    );
  };

  if (projectQuery.isPending) {
    return (
      <main id="main-content" className="mx-auto max-w-[1500px] px-5 pb-[60px] pt-[38px] md:px-[42px] md:pb-[72px] md:pt-[54px]">
        <div className="grid min-h-60 place-items-center text-sm text-muted">
          Loading project…
        </div>
      </main>
    );
  }

  if (!project) {
    return (
      <main id="main-content" className="mx-auto max-w-[1500px] px-5 pb-[60px] pt-[38px] md:px-[42px] md:pb-[72px] md:pt-[54px]">
        <section className="mt-8 rounded-xl border border-dashed border-[#c7c9bf] bg-surface p-12 text-center text-muted">
          <span className="font-mono text-[54px] font-bold leading-[.9] tracking-[-.08em] text-[#c5c7bd]">
            404
          </span>
          <h2 className="my-3 text-xl font-bold text-ink">Project not found</h2>
          <p className="m-0 text-sm">
            The project you are looking for does not exist or you do not have permission to access it.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main id="main-content" className="mx-auto max-w-[1500px] px-5 pb-[60px] pt-[38px] md:px-[42px] md:pb-[72px] md:pt-[54px]">
      {/* Header & Breadcrumbs Bar */}
      <ProjectPageHeader
        organizationSlug={organization.slug}
        project={project}
        breadcrumbs={breadcrumbs}
        onNavigateToRoot={handleNavigateToRoot}
        onNavigateToFolder={handleNavigateToFolder}
        onOpenMembers={() => setProjectMembersOpen(true)}
        onOpenCreateFolder={() => setCreateDialogOpen(true)}
        onOpenUploadMedia={() => setUploadMediaOpen(true)}
        onOpenEditProject={() => setEditProjectOpen(true)}
        onOpenDeleteProject={() => setDeleteProjectOpen(true)}
      />

      {/* Filter / View Bar */}
      {(folders.length > 0 || mediaList.length > 0) && (
        <section className="mt-8 mb-6">
          <FolderFilterBar
            search={folderSearch}
            onSearchChange={setFolderSearch}
            count={visibleFolders.length + visibleMedia.length}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            sortOption={folderSort}
            onSortChange={setFolderSort}
            borderTop={false}
          />
        </section>
      )}

      {/* Folders Section */}
      {visibleFolders.length > 0 && (
        <section className="mt-6">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted mb-3 font-mono">
            Folders ({visibleFolders.length})
          </h2>
          {viewMode === "list" ? (
            <FolderTableView
              folders={visibleFolders}
              onOpen={(f) => handleNavigateToFolder(f.id)}
              onRename={(f) => setRenameFolder(f)}
              onMove={(f) => setMoveFolder(f)}
              onDelete={(f) => setDeleteFolder(f)}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {visibleFolders.map((folder, index) => (
                <FolderCard
                  key={folder.id}
                  folder={folder}
                  index={index}
                  onOpen={(f) => handleNavigateToFolder(f.id)}
                  onRename={(f) => setRenameFolder(f)}
                  onMove={(f) => setMoveFolder(f)}
                  onDelete={(f) => setDeleteFolder(f)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Media Assets Section */}
      {visibleMedia.length > 0 && (
        <section className="mt-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted font-mono">
              Media Assets ({visibleMedia.length})
            </h2>
            <Button variant="outline" size="sm" onClick={() => setUploadMediaOpen(true)}>
              <Upload size={14} className="mr-1.5" />
              Upload Media
            </Button>
          </div>

          {viewMode === "list" ? (
            <MediaTableView
              mediaList={visibleMedia}
              onPlay={(m: MediaResponse) => setPlayingMediaId(m.id)}
              onEdit={(m: MediaResponse) => setEditingMedia(m)}
              onMove={(m: MediaResponse) => setMovingMedia(m)}
              onDelete={(m: MediaResponse) => setDeleteMediaItem(m)}
              onRetryTranscode={handleRetryTranscode}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {visibleMedia.map((media: MediaResponse) => (
                <MediaCard
                  key={media.id}
                  media={media}
                  onPlay={(m: MediaResponse) => setPlayingMediaId(m.id)}
                  onEdit={(m: MediaResponse) => setEditingMedia(m)}
                  onMove={(m: MediaResponse) => setMovingMedia(m)}
                  onDelete={(m: MediaResponse) => setDeleteMediaItem(m)}
                  onRetryTranscode={handleRetryTranscode}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Empty State when no folders and no media */}
      {!foldersQuery.isPending && !mediaQuery.isPending && folders.length === 0 && mediaList.length === 0 && (
        <section className="mt-10 rounded-xl border border-dashed border-[#c7c9bf] bg-surface p-12 text-center">
          <Film className="mx-auto text-muted" size={40} />
          <h2 className="mt-4 text-lg font-bold text-ink">No media assets uploaded yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            Upload video cuts, image keyframes, or audio tracks to start gathering frame-accurate feedback.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setCreateDialogOpen(true)}>
              <FolderPlus size={15} />
              Create folder
            </Button>
            <Button variant="primary" size="sm" onClick={() => setUploadMediaOpen(true)}>
              <Upload size={15} />
              Upload media
            </Button>
          </div>
        </section>
      )}

      {/* Dialogs */}
      <UploadMediaDialog
        open={uploadMediaOpen}
        onOpenChange={setUploadMediaOpen}
        organizationId={organization.id}
        projectId={project.id}
        folderId={currentFolderId}
        folderName={currentFolderName}
      />

      <MediaViewerModal
        open={Boolean(playingMediaId)}
        onOpenChange={(open) => !open && setPlayingMediaId(null)}
        organizationId={organization.id}
        projectId={project.id}
        mediaId={playingMediaId}
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

      <CreateFolderDialog
        isOpen={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        projectId={project.id}
        parentId={currentFolderId}
      />

      <RenameFolderDialog
        folder={renameFolder}
        isOpen={!!renameFolder}
        onClose={() => setRenameFolder(null)}
        projectId={project.id}
      />

      <MoveFolderDialog
        folder={moveFolder}
        isOpen={!!moveFolder}
        onClose={() => setMoveFolder(null)}
        projectId={project.id}
      />

      <DeleteFolderDialog
        folder={deleteFolder}
        isOpen={!!deleteFolder}
        onClose={() => setDeleteFolder(null)}
        projectId={project.id}
        onDeleted={() => {
          if (currentFolderId === deleteFolder?.id) {
            handleNavigateToRoot();
          }
        }}
      />

      <EditProjectDialog
        project={project}
        isOpen={editProjectOpen}
        onClose={() => setEditProjectOpen(false)}
      />

      <DeleteProjectDialog
        project={project}
        isOpen={deleteProjectOpen}
        onClose={() => setDeleteProjectOpen(false)}
        onDeleted={() => {
          router.push(`/app/organizations/${organization.slug}/projects`);
        }}
      />

      <ProjectMembersDialog
        project={project}
        isOpen={projectMembersOpen}
        onClose={() => setProjectMembersOpen(false)}
      />

      <TranscodingToast
        mediaList={mediaList}
        onPlayMedia={(m) => setPlayingMediaId(m.id)}
      />
    </main>
  );
}
