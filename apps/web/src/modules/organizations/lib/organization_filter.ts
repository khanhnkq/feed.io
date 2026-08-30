import type { OrganizationResponse } from "@feedio/api-client";
import type { SortOptionItem } from "@/modules/ui";

export type SortOption = "name_asc" | "name_desc" | "created_desc" | "created_asc";

export const ORGANIZATION_SORT_OPTIONS: SortOptionItem<SortOption>[] = [
  { value: "name_asc", label: "Name (A → Z)" },
  { value: "name_desc", label: "Name (Z → A)" },
  { value: "created_desc", label: "Newest first" },
  { value: "created_asc", label: "Oldest first" },
];

export function filterOrganizations(
  organizations: OrganizationResponse[],
  search: string,
): OrganizationResponse[] {
  const query = search.trim().toLowerCase();
  if (!query) {
    return organizations;
  }
  return organizations.filter(
    (org) =>
      org.name.toLowerCase().includes(query) ||
      org.slug.toLowerCase().includes(query),
  );
}

export function sortOrganizations(
  organizations: OrganizationResponse[],
  sortOption: SortOption,
): OrganizationResponse[] {
  const copy = [...organizations];
  switch (sortOption) {
    case "name_asc":
      return copy.sort((a, b) => a.name.localeCompare(b.name));
    case "name_desc":
      return copy.sort((a, b) => b.name.localeCompare(a.name));
    case "created_desc":
    case "created_asc":
    default:
      return copy;
  }
}
