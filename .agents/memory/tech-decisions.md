---
type: project
created: 2026-08-23
updated: 2026-08-23
---

# Feed.io Technical Decisions

## Canonical Domain Hierarchy

```text
User → Organization → Project → Asset → Asset Version
```

`Organization` is the persisted tenant aggregate in the domain, backend and database.
`Workspace` is the product/UI context used when a user opens an organization. The two
terms have an explicit layer mapping and must not be mixed inside the same layer.

## UI-to-domain mapping

| UI context | Primary entities |
|---|---|
| Global | Users, Organization Members |
| Workspace | Organizations, Projects, Organization Members |
| Project | Projects, Project Members, Folders, Assets, Share Links |
| Asset View | Assets, Asset Versions, Media Objects |
| Review View | Comments, Annotations, Review Decisions |

## Canonical routes

```text
/app
/app/workspaces/{workspaceSlug}
/app/workspaces/{workspaceSlug}/projects/{projectSlug}
/app/workspaces/{workspaceSlug}/projects/{projectSlug}/assets/{assetSlug}
```

## MVP dashboards and navigation

Feed.io has exactly three dashboards/workspaces in MVP:

1. Global Dashboard manages organizations exposed as workspaces.
2. Workspace Dashboard manages projects and organization members.
3. Project Workspace manages media and project members.

Sidebar adapts to Global, Workspace and Project context. Asset/review view keeps the
Project sidebar and renders video plus comments in the main content; it does not add
a fourth sidebar or dashboard.

Scoped roles use explicit names such as `platform_role`, `organization_role` and
`project_role`. Projects are created only inside an organization/workspace context.
