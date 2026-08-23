import type { ProjectResponse } from "@feedio/api-client";

export function filterProjects(
  projects: ProjectResponse[] | undefined,
  search: string,
): ProjectResponse[] {
  const query = search.trim().toLocaleLowerCase();
  if (!projects) return [];
  if (!query) return projects;
  return projects.filter((project) =>
    `${project.name} ${project.description}`.toLocaleLowerCase().includes(query),
  );
}
