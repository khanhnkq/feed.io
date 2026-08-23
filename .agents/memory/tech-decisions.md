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

`Organization` is the tenant aggregate and canonical term across database, backend,
API, frontend copy, frontend modules and routes. `Workspace` must not be used as an
alias for Organization.

## UI-to-domain mapping

| UI context | Primary entities |
|---|---|
| Global | Users, Organization Members |
| Organization | Organizations, Projects, Organization Members |
| Project | Projects, Project Members, Folders, Assets, Share Links |
| Asset View | Assets, Asset Versions, Media Objects |
| Review View | Comments, Annotations, Review Decisions |

## Canonical routes

```text
/app
/app/organizations/{organizationSlug}
/app/organizations/{organizationSlug}/projects/{projectSlug}
/app/organizations/{organizationSlug}/projects/{projectSlug}/assets/{assetSlug}
```

## MVP dashboards and navigation

Feed.io has exactly three dashboards in MVP:

1. Global Dashboard manages organizations.
2. Organization Dashboard manages projects and organization members.
3. Project Dashboard manages media and project members.

Sidebar adapts to Global, Organization and Project context. Asset/review view keeps the
Project sidebar and renders video plus comments in the main content; it does not add
a fourth sidebar or dashboard.

Scoped roles use explicit names such as `platform_role`, `organization_role` and
`project_role`. Projects are created only inside an Organization context.
