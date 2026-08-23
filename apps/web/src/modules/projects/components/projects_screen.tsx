"use client";

import {
  getListProjectsQueryKey,
  type ProjectResponse,
  useCreateProject,
  useListProjects,
} from "@feedio/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { LayoutGrid, List, Plus, Search, SlidersHorizontal, X } from "lucide-react";
import { type FormEvent, useState } from "react";

import { ProjectCard } from "./project_card";

export function ProjectsScreen() {
  const queryClient = useQueryClient();
  const projects = useListProjects();
  const [isCreating, setIsCreating] = useState(false);
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

  return (
    <main className="projects-page">
      <section className="page-heading">
        <div>
          <p className="eyebrow">Active workspace / NK Studio</p>
          <h1>Projects</h1>
          <p className="page-description">Review work in motion, from first cut to final approval.</p>
        </div>
        <button className="primary-button" type="button" onClick={() => setIsCreating(true)}>
          <Plus size={17} /> New project
        </button>
      </section>

      <section className="project-toolbar" aria-label="Project filters">
        <label className="search-field">
          <Search size={17} />
          <input aria-label="Search projects" placeholder="Search projects" />
        </label>
        <div className="toolbar-actions">
          <button className="filter-button" type="button">
            <SlidersHorizontal size={16} /> Filter
          </button>
          <span className="view-toggle">
            <button className="selected" type="button" aria-label="Grid view">
              <LayoutGrid size={16} />
            </button>
            <button type="button" aria-label="List view">
              <List size={16} />
            </button>
          </span>
        </div>
      </section>

      <ProjectCollection projects={projects.data} isLoading={projects.isLoading} isError={projects.isError} />

      {isCreating ? (
        <div className="dialog-backdrop" role="presentation">
          <section className="create-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title">
            <button className="dialog-close" type="button" onClick={() => setIsCreating(false)} aria-label="Close">
              <X size={18} />
            </button>
            <p className="eyebrow">Create workspace</p>
            <h2 id="dialog-title">Start a new project</h2>
            <p>Give the review room a clear client or campaign name.</p>
            <form onSubmit={handleSubmit}>
              <label>
                Project name
                <input name="name" required maxLength={120} placeholder="Summer campaign" autoFocus />
              </label>
              <label>
                Description
                <textarea name="description" maxLength={500} placeholder="What is the team shipping?" />
              </label>
              <button className="primary-button" disabled={createProject.isPending} type="submit">
                {createProject.isPending ? "Creating…" : "Create project"}
              </button>
            </form>
          </section>
        </div>
      ) : null}
    </main>
  );
}

interface ProjectCollectionProps {
  projects?: ProjectResponse[];
  isLoading: boolean;
  isError: boolean;
}

function ProjectCollection({ projects, isLoading, isError }: ProjectCollectionProps) {
  if (isLoading) return <div className="empty-state">Loading project rooms…</div>;
  if (isError) return <div className="empty-state error-state">API unavailable. Start FastAPI on port 8000.</div>;
  if (!projects?.length) {
    return (
      <div className="empty-state">
        <span className="empty-index">00</span>
        <h2>No projects yet</h2>
        <p>Create the first review room for your agency.</p>
      </div>
    );
  }
  return (
    <section className="project-grid" aria-label="Projects">
      {projects.map((project, index) => (
        <ProjectCard key={project.id} project={project} index={index} />
      ))}
    </section>
  );
}
