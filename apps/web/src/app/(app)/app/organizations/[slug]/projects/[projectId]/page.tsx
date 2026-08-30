"use client";

import type { FolderResponse } from "@feedio/api-client";
import {
  useGetFolderBreadcrumbs,
  useGetProject,
  useListFolders,
} from "@feedio/api-client";
import {
  Film,
  FolderPlus,
  Globe,
  Lock,
  MoreVertical,
  Pencil,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

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
  ProjectBreadcrumbs,
  ProjectMembersDialog,
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

  const projectId =
    typeof params?.projectId === "string" ? params.projectId : "";
  const currentFolderId = searchParams.get("folderId");

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [renameFolder, setRenameFolder] = useState<FolderResponse | null>(null);
  const [moveFolder, setMoveFolder] = useState<FolderResponse | null>(null);
  const [deleteFolder, setDeleteFolder] = useState<FolderResponse | null>(null);
  const [editProjectOpen, setEditProjectOpen] = useState(false);
  const [deleteProjectOpen, setDeleteProjectOpen] = useState(false);
  const [projectMembersOpen, setProjectMembersOpen] = useState(false);
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);
  const [folderSearch, setFolderSearch] = useState("");
  const [folderSort, setFolderSort] = useState<SortOption>("name_asc");
  const [folderViewMode, setFolderViewMode] = useState<ViewMode>("grid");
  const projectMenuRef = useRef<HTMLDivElement>(null);

  const projectQuery = useGetProject(organization.id, projectId, {
    query: {
      enabled: !!projectId,
    },
  });
  const project = projectQuery.data;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        projectMenuRef.current &&
        !projectMenuRef.current.contains(event.target as Node)
      ) {
        setProjectMenuOpen(false);
      }
    }
    if (projectMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [projectMenuOpen]);

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

  const folders = foldersQuery.data ?? [];
  const breadcrumbs = currentFolderId ? breadcrumbsQuery.data ?? [] : [];

  const visibleFolders = useMemo(
    () => sortFolders(filterFolders(foldersQuery.data, folderSearch), folderSort),
    [foldersQuery.data, folderSearch, folderSort],
  );

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
            The project you are looking for does not exist or you do not have permission to access it.
          </p>
        </section>
      </main>
    );
  }

  const isPrivate = project.visibility === "private";

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
          <div className="mt-3 flex items-center gap-3 flex-wrap">
            <h1 className="text-[28px] font-bold tracking-tight text-ink md:text-[34px]">
              {breadcrumbs.length > 0
                ? breadcrumbs[breadcrumbs.length - 1].name
                : project.name}
            </h1>
            {isPrivate ? (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-line bg-paper px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-muted">
                <Lock size={12} className="text-muted" />
                <span>Private</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-line bg-paper px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-muted">
                <Globe size={12} className="text-muted" />
                <span>Public</span>
              </span>
            )}
          </div>
          {breadcrumbs.length === 0 && (
            <p className="mt-1 text-sm text-muted">
              {project.description ||
                "Upload video cuts and organize assets for collaborative review."}
            </p>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setProjectMembersOpen(true)}
          >
            <Users size={15} />
            Access
          </Button>

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
            Upload video cut (Coming soon)
          </Button>

          <div ref={projectMenuRef} className="relative">
            <button
              type="button"
              aria-label="Project options"
              onClick={() => setProjectMenuOpen((prev) => !prev)}
              className="grid size-8 place-items-center rounded-lg border border-line bg-surface text-muted transition hover:border-ink hover:text-ink"
            >
              <MoreVertical size={16} />
            </button>

            {projectMenuOpen && (
              <div className="absolute right-0 top-10 z-20 w-44 rounded-lg border border-line bg-surface py-1 shadow-lg animate-in fade-in zoom-in-95 duration-100">
                <button
                  type="button"
                  onClick={() => {
                    setProjectMenuOpen(false);
                    setProjectMembersOpen(true);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-ink transition hover:bg-[#f3f4ee]"
                >
                  <Users size={13} />
                  Manage access
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProjectMenuOpen(false);
                    setEditProjectOpen(true);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-ink transition hover:bg-[#f3f4ee]"
                >
                  <Pencil size={13} />
                  Edit project
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProjectMenuOpen(false);
                    setDeleteProjectOpen(true);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-xs font-medium text-red-600 transition hover:bg-red-50"
                >
                  <Trash2 size={13} />
                  Delete project
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Folders Section */}
      <section className="mt-8">
        {folders.length > 0 && (
          <div className="mb-6">
            <FolderFilterBar
              search={folderSearch}
              onSearchChange={setFolderSearch}
              count={visibleFolders.length}
              viewMode={folderViewMode}
              onViewModeChange={setFolderViewMode}
              sortOption={folderSort}
              onSortChange={setFolderSort}
              borderTop={false}
            />
          </div>
        )}

        {foldersQuery.isPending ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-20 animate-pulse rounded-xl border border-line bg-[#f5f6ee]"
              />
            ))}
          </div>
        ) : visibleFolders.length > 0 ? (
          folderViewMode === "list" ? (
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
          )
        ) : (
          <div className="rounded-xl border border-dashed border-[#dcded3] bg-[#fafbf7] p-8 text-center">
            <p className="text-xs font-medium text-muted">
              {folderSearch
                ? "No folders match your search query."
                : "No folders in this directory yet. Create a folder to organize your video cuts."}
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
    </main>
  );
}
