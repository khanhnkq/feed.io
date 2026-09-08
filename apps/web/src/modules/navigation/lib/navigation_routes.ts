export function getOrganizationRoute(slug: string): string {
  return `/app/organizations/${slug}`;
}

export function getProjectListRoute(orgSlug: string): string {
  return `/app/organizations/${orgSlug}/projects`;
}

export function getProjectDashboardRoute(orgSlug: string, projectId: string): string {
  return `/app/organizations/${orgSlug}/projects/${projectId}`;
}

export function getProjectKanbanRoute(orgSlug: string, projectId: string): string {
  return `/app/organizations/${orgSlug}/projects/${projectId}/kanban`;
}

export function getBreadcrumbSegments(
  organization?: { name: string },
  projectName?: string,
): string[] {
  const segments = ["Self-hosted platform"];
  if (organization) {
    segments.push(organization.name);
  }
  if (projectName) {
    segments.push(projectName);
  }
  return segments;
}
