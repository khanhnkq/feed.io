import { describe, expect, it, vi } from "vitest";

import { ProjectBreadcrumbs } from "./project_breadcrumbs";

describe("ProjectBreadcrumbs", () => {
  it("renders root breadcrumb correctly when no subfolders", () => {
    const onRoot = vi.fn();
    const onFolder = vi.fn();
    const el = ProjectBreadcrumbs({
      organizationSlug: "acme",
      projectId: "proj-123",
      projectName: "Commercial Campaign",
      breadcrumbs: [],
      onNavigateToRoot: onRoot,
      onNavigateToFolder: onFolder,
    });

    expect(el.type).toBe("nav");
    expect(el.props["aria-label"]).toBe("Breadcrumb");
  });

  it("renders nested folder path items", () => {
    const onRoot = vi.fn();
    const onFolder = vi.fn();
    const el = ProjectBreadcrumbs({
      organizationSlug: "acme",
      projectId: "proj-123",
      projectName: "Commercial Campaign",
      breadcrumbs: [
        { id: "folder-1", name: "Cuts V1" },
        { id: "folder-2", name: "Audio" },
      ],
      onNavigateToRoot: onRoot,
      onNavigateToFolder: onFolder,
    });

    expect(el.props.children).toBeDefined();
  });
});
