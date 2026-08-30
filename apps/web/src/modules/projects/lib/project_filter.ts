import type { FolderResponse, ProjectResponse } from "@feedio/api-client";

export type SortOption =
  | "name_asc"
  | "name_desc"
  | "created_desc"
  | "created_asc";

export type PrivacyFilter = "all" | "public" | "private";

export function filterProjects(
  projects: ProjectResponse[] | undefined,
  search: string,
  privacy: PrivacyFilter = "all",
): ProjectResponse[] {
  if (!projects) return [];
  const query = search.trim().toLocaleLowerCase();
  return projects.filter((project) => {
    if (privacy === "public" && project.visibility === "private") return false;
    if (privacy === "private" && project.visibility !== "private") return false;
    if (!query) return true;
    return `${project.name} ${project.description}`.toLocaleLowerCase().includes(query);
  });
}

export function sortProjects(
  projects: ProjectResponse[] | undefined,
  sortOption: SortOption,
): ProjectResponse[] {
  if (!projects) return [];
  const sorted = [...projects];

  switch (sortOption) {
    case "name_asc":
      return sorted.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
    case "name_desc":
      return sorted.sort((a, b) => b.name.localeCompare(a.name, undefined, { sensitivity: "base" }));
    case "created_desc":
      return sorted.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    case "created_asc":
      return sorted.sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
    default:
      return sorted;
  }
}

export function filterFolders(
  folders: FolderResponse[] | undefined,
  search: string,
): FolderResponse[] {
  const query = search.trim().toLocaleLowerCase();
  if (!folders) return [];
  if (!query) return folders;
  return folders.filter((folder) =>
    folder.name.toLocaleLowerCase().includes(query),
  );
}

export function sortFolders(
  folders: FolderResponse[] | undefined,
  sortOption: SortOption,
): FolderResponse[] {
  if (!folders) return [];
  const sorted = [...folders];

  switch (sortOption) {
    case "name_asc":
      return sorted.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
    case "name_desc":
      return sorted.sort((a, b) => b.name.localeCompare(a.name, undefined, { sensitivity: "base" }));
    case "created_desc":
      return sorted.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    case "created_asc":
      return sorted.sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
    default:
      return sorted;
  }
}
