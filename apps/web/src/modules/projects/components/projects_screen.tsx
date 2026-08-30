"use client";

import type { ProjectResponse } from "@feedio/api-client";
import {
  getListProjectsQueryKey,
  useCreateProject,
  useListProjects,
} from "@feedio/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";

import { Button } from "@/modules/ui";
import { useOrganization } from "@/shared/providers/organization_context";
import { filterProjects, type SortOption, sortProjects } from "../lib/project_filter";
import { CreateProjectDialog } from "./create_project_dialog";
import { DeleteProjectDialog } from "./delete_project_dialog";
import { EditProjectDialog } from "./edit_project_dialog";
import { ProjectCollection } from "./project_collection";
import { ProjectFilterBar, type ViewMode } from "./project_filter_bar";
import { ProjectMembersDialog } from "./project_members_dialog";

export function ProjectsScreen() {
  const organization = useOrganization();
  const queryClient = useQueryClient();
  const projects = useListProjects(organization.id);
  const [isCreating, setIsCreating] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectResponse | null>(null);
  const [deletingProject, setDeletingProject] = useState<ProjectResponse | null>(null);
  const [managingMembersProject, setManagingMembersProject] =
    useState<ProjectResponse | null>(null);
  const [search, setSearch] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("created_desc");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");

  const createProject = useCreateProject({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: getListProjectsQueryKey(organization.id),
        });
        setIsCreating(false);
      },
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    createProject.mutate({
      organizationId: organization.id,
      data: {
        name: String(form.get("name") ?? ""),
        description: String(form.get("description") ?? ""),
        visibility: String(form.get("visibility") ?? "public"),
      },
    });
  }

  function openCreateDialog() {
    createProject.reset();
    setIsCreating(true);
  }

  const visibleProjects = useMemo(
    () => sortProjects(filterProjects(projects.data, search), sortOption),
    [projects.data, search, sortOption],
  );

  return (
    <main
      id="main-content"
      className="mx-auto max-w-[1500px] px-5 pb-[60px] pt-[38px] md:px-[42px] md:pb-[72px] md:pt-[54px]"
    >
      <section className="flex flex-col items-start gap-7 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="m-0 text-[clamp(44px,6vw,76px)] font-bold leading-[.95] tracking-[-.065em]">
            {`${organization.name}'s Projects`}
          </h1>
          <p className="mt-[18px] text-[15px] text-muted">
            Review work in motion, from first cut to final approval.
          </p>
        </div>
        <Button onClick={openCreateDialog} variant="primary">
          <Plus size={17} /> New project
        </Button>
      </section>

      <ProjectFilterBar
        search={search}
        onSearchChange={setSearch}
        count={visibleProjects.length}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        sortOption={sortOption}
        onSortChange={setSortOption}
      />

      <div className="mt-8">
        <ProjectCollection
          projects={visibleProjects}
          isLoading={projects.isLoading}
          isError={projects.isError}
          hasSearch={Boolean(search.trim())}
          viewMode={viewMode}
          onEdit={(proj) => setEditingProject(proj)}
          onDelete={(proj) => setDeletingProject(proj)}
          onManageMembers={(proj) => setManagingMembersProject(proj)}
          onRetry={() => projects.refetch()}
        />
      </div>

      {isCreating ? (
        <CreateProjectDialog
          isPending={createProject.isPending}
          hasError={createProject.error !== null}
          onClose={() => setIsCreating(false)}
          onSubmit={handleSubmit}
        />
      ) : null}

      <EditProjectDialog
        project={editingProject}
        isOpen={!!editingProject}
        onClose={() => setEditingProject(null)}
      />

      <DeleteProjectDialog
        project={deletingProject}
        isOpen={!!deletingProject}
        onClose={() => setDeletingProject(null)}
      />

      <ProjectMembersDialog
        project={managingMembersProject}
        isOpen={!!managingMembersProject}
        onClose={() => setManagingMembersProject(null)}
      />
    </main>
  );
}
