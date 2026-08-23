"use client";

import {
  getListProjectsQueryKey,
  type ProjectResponse,
  useCreateProject,
  useListProjects,
} from "@feedio/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { LayoutGrid, List, Plus, Search } from "lucide-react";
import { type FormEvent, useMemo, useState } from "react";

import { filterProjects } from "../lib/project_filter";
import { CreateProjectDialog } from "./create_project_dialog";
import { ProjectCard } from "./project_card";

type ViewMode = "grid" | "list";
const primaryButtonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-ink bg-ink px-4 text-[13px] font-bold text-white shadow-[3px_3px_0_#d8ff43] transition hover:-translate-x-px hover:-translate-y-px hover:shadow-[5px_5px_0_#d8ff43] focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-focus disabled:cursor-wait disabled:opacity-55";

export function ProjectsScreen() {
  const queryClient = useQueryClient();
  const projects = useListProjects();
  const [isCreating, setIsCreating] = useState(false);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const createProject = useCreateProject({
    mutation: {
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: getListProjectsQueryKey() });
        setIsCreating(false);
      },
    },
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    createProject.mutate({
      data: {
        name: String(form.get("name") ?? ""),
        description: String(form.get("description") ?? ""),
      },
    });
  }

  function openCreateDialog() {
    createProject.reset();
    setIsCreating(true);
  }

  const visibleProjects = useMemo(
    () => filterProjects(projects.data, search),
    [projects.data, search],
  );

  return (
    <main id="main-content" className="mx-auto max-w-[1500px] px-5 pb-[60px] pt-[38px] md:px-[42px] md:pb-[72px] md:pt-[54px]">
      <section className="flex flex-col items-start gap-7 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="mb-3 text-[11px] font-extrabold uppercase tracking-[.13em] text-muted">
            Active workspace / Agency
          </p>
          <h1 className="m-0 text-[clamp(44px,6vw,76px)] font-bold leading-[.95] tracking-[-.065em]">Projects</h1>
          <p className="mt-[18px] text-[15px] text-muted">Review work in motion, from first cut to final approval.</p>
        </div>
        <button className={primaryButtonClass} type="button" onClick={openCreateDialog}>
          <Plus size={17} /> New project
        </button>
      </section>

      <section className="mt-12 flex flex-col gap-[18px] border-t border-line pt-[18px] md:flex-row md:items-center md:justify-between" aria-label="Project filters">
        <label className="flex w-full items-center gap-2.5 text-[#999c92] md:max-w-[360px]">
          <Search size={17} />
          <input
            className="w-full border-0 bg-transparent py-2 text-ink outline-none placeholder:text-[#999c92] focus-visible:ring-0"
            aria-label="Search projects"
            placeholder="Search by name or description"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <div className="flex items-center justify-between gap-2 md:justify-start">
          <span className="font-mono text-[10px] font-bold uppercase tracking-[.06em] text-muted" aria-live="polite">
            {visibleProjects.length} {visibleProjects.length === 1 ? "project" : "projects"}
          </span>
          <span className="flex items-center" aria-label="Project layout">
            <button
              className={`-mr-px flex min-h-11 items-center rounded-l-lg border border-line px-3 transition-colors focus-visible:z-10 focus-visible:outline-3 focus-visible:outline-focus ${viewMode === "grid" ? "bg-ink text-white" : "bg-surface text-muted"}`}
              type="button"
              aria-label="Grid view"
              aria-pressed={viewMode === "grid"}
              onClick={() => setViewMode("grid")}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              className={`flex min-h-11 items-center rounded-r-lg border border-line px-3 transition-colors focus-visible:z-10 focus-visible:outline-3 focus-visible:outline-focus ${viewMode === "list" ? "bg-ink text-white" : "bg-surface text-muted"}`}
              type="button"
              aria-label="List view"
              aria-pressed={viewMode === "list"}
              onClick={() => setViewMode("list")}
            >
              <List size={16} />
            </button>
          </span>
        </div>
      </section>

      <ProjectCollection
        projects={visibleProjects}
        isLoading={projects.isLoading}
        isError={projects.isError}
        hasSearch={Boolean(search.trim())}
        viewMode={viewMode}
      />

      {isCreating ? (
        <CreateProjectDialog
          isPending={createProject.isPending}
          hasError={createProject.isError}
          onClose={() => setIsCreating(false)}
          onSubmit={handleSubmit}
        />
      ) : null}
    </main>
  );
}

interface ProjectCollectionProps {
  projects?: ProjectResponse[];
  isLoading: boolean;
  isError: boolean;
  hasSearch: boolean;
  viewMode: ViewMode;
}

function ProjectCollection({ projects, isLoading, isError, hasSearch, viewMode }: ProjectCollectionProps) {
  if (isLoading) return <ProjectSkeleton />;
  if (isError) {
    return (
      <div className="grid min-h-80 place-items-center content-center rounded-xl border border-dashed border-[#c7c9bf] bg-[#fff1eb] p-12 text-center text-[#a5441d]" role="alert">
        <span className="font-mono text-[66px] font-bold leading-[.9] tracking-[-.08em] text-[#d9a896]">403</span>
        <h2 className="my-2 text-xl font-bold text-[#62220c]">Workspace access is not ready</h2>
        <p className="m-0">We could not load your active workspace. Retry or sign in again.</p>
      </div>
    );
  }
  if (!projects?.length) {
    return (
      <div className="grid min-h-80 place-items-center content-center rounded-xl border border-dashed border-[#c7c9bf] p-12 text-center text-muted">
        <span className="font-mono text-[66px] font-bold leading-[.9] tracking-[-.08em] text-[#c5c7bd]">00</span>
        <h2 className="my-2 text-xl font-bold text-ink">{hasSearch ? "No matching projects" : "No projects yet"}</h2>
        <p className="m-0">{hasSearch ? "Try a different search term." : "Create the first review room for your agency."}</p>
      </div>
    );
  }
  const layoutClass =
    viewMode === "list"
      ? "grid grid-cols-1 gap-[18px]"
      : "grid grid-cols-1 gap-[18px] sm:grid-cols-2 xl:grid-cols-3";
  return (
    <section className={layoutClass} aria-label="Projects">
      {projects.map((project, index) => (
        <ProjectCard key={project.id} project={project} index={index} viewMode={viewMode} />
      ))}
    </section>
  );
}

function ProjectSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 xl:grid-cols-3" aria-label="Loading projects" aria-busy="true">
      {[0, 1, 2].map((item) => (
        <div className="min-h-[330px] rounded-xl border border-[#d8d9d2] bg-surface p-6" key={item} aria-hidden="true">
          <span className="-mx-6 -mt-6 mb-7 block h-[170px] animate-pulse rounded-t-xl bg-[#e5e6df]" />
          <i className="mt-3 block h-3 w-2/3 animate-pulse rounded-sm bg-[#e5e6df]" />
          <i className="mt-3 block h-3 w-2/5 animate-pulse rounded-sm bg-[#e5e6df]" />
        </div>
      ))}
    </div>
  );
}
