"use client";

import type { FolderResponse } from "@feedio/api-client";
import {
  useGetFolderBreadcrumbs,
  useListFolders,
  useListProjects,
} from "@feedio/api-client";
import { Film, FolderPlus, Upload } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import {
  CreateFolderDialog,
  DeleteFolderDialog,
  FolderCard,
  ProjectBreadcrumbs,
  RenameFolderDialog,
} from "@/modules/projects";
import { Button } from "@/modules/ui";
import { useOrganization } from "@/shared/providers/organization_context";

export default function ProjectDashboardPage() {
  const router = useRouter();
  const organization = useOrganization();
  const params = useParams();
  const searchParams = useSearchParams();

  const projectId =
    typeof params?.projectId === "string" ? params.projectId : "";
  const currentFolderId = searchParams.get("folderId");

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [renameFolder, setRenameFolder] = useState<FolderResponse | null>(null);
  const [deleteFolder, setDeleteFolder] = useState<FolderResponse | null>(null);

  const projectsQuery = useListProjects(organization.id);
  const project = projectsQuery.data?.find((item) => item.id === projectId);

  const foldersQuery = useListFolders(
    organization.id,
    projectId,
    currentFolderId ? { parent_id: currentFolderId } : undefined,
  );

  const breadcrumbsQuery = useGetFolderBreadcrumbs(
    organization.id,
    projectId,
    currentFolderId ?? "",
    {
      query: {
        enabled: !!currentFolderId,
      },
    },
  );

  const handleNavigateToRoot = () => {
    router.push(`/app/organizations/${organization.slug}/projects/${projectId}`);
  };

  const handleNavigateToFolder = (folderId: string) => {
    router.push(
      `/app/organizations/${organization.slug}/projects/${projectId}?folderId=${folderId}`,
    );
  };

  if (projectsQuery.isPending) {
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
            The project you are looking for does not exist in this organization.
          </p>
        </section>
      </main>
    );
  }

  const folders = foldersQuery.data ?? [];
  const breadcrumbs = currentFolderId ? breadcrumbsQuery.data ?? [] : [];

  return (
    <main
      id="main-content"
      className="mx-auto max-w-[1500px] px-5 pb-[60px] pt-[38px] md:px-[42px] md:pb-[72px] md:pt-[54px]"
    >
      {/* Header & Breadcrumbs Bar */}
      <section className="flex flex-col gap-4 border-b border-line pb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <ProjectBreadcrumbs
            organizationSlug={organization.slug}
            projectId={project.id}
            projectName={project.name}
            breadcrumbs={breadcrumbs}
            onNavigateToRoot={handleNavigateToRoot}
            onNavigateToFolder={handleNavigateToFolder}
          />
          <h1 className="mt-3 text-[28px] font-bold tracking-tight text-ink md:text-[34px]">
            {breadcrumbs.length > 0
              ? breadcrumbs[breadcrumbs.length - 1].name
              : project.name}
          </h1>
          {breadcrumbs.length === 0 && (
            <p className="mt-1 text-sm text-muted">
              {project.description ||
                "Upload video cuts and organize assets for collaborative review."}
            </p>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCreateDialogOpen(true)}
          >
            <FolderPlus size={15} />
            New folder
          </Button>
          <Button variant="primary" size="sm" disabled>
            <Upload size={15} />
            Upload video cut
          </Button>
        </div>
      </section>

      {/* Folders Section */}
      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-muted">
            Folders {folders.length > 0 && `(${folders.length})`}
          </h2>
        </div>

        {foldersQuery.isPending ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-xl border border-line bg-[#f5f6ee]"
              />
            ))}
          </div>
        ) : folders.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {folders.map((folder, index) => (
              <FolderCard
                key={folder.id}
                folder={folder}
                index={index}
                onOpen={(f) => handleNavigateToFolder(f.id)}
                onRename={(f) => setRenameFolder(f)}
                onDelete={(f) => setDeleteFolder(f)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[#dcded3] bg-[#fafbf7] p-8 text-center">
            <p className="text-xs font-medium text-muted">
              No folders in this directory yet. Create a folder to organize your video cuts.
            </p>
          </div>
        )}
      </section>

      {/* Media Assets Section */}
      <section className="mt-10 rounded-xl border border-dashed border-[#c7c9bf] bg-surface p-12 text-center">
        <Film className="mx-auto text-muted" size={40} />
        <h2 className="mt-4 text-lg font-bold text-ink">
          No media assets uploaded yet
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted">
          Upload video cuts, audio tracks, or storyboard revisions to start
          gathering frame-accurate feedback.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCreateDialogOpen(true)}
          >
            <FolderPlus size={15} />
            Create folder
          </Button>
          <Button variant="primary" size="sm" disabled>
            <Upload size={15} />
            Upload video cut (Coming soon)
          </Button>
        </div>
      </section>

      {/* Dialogs */}
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
    </main>
  );
}
