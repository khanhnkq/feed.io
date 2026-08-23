# ADR 0005 — Context Vocabulary

## Status

Accepted — 2026-08-23

## Context

The codebase inconsistently uses "workspace" as a UI alias for `Organization`.
This creates confusion across database, backend, API, frontend and URL paths.
We need a single, canonical vocabulary for the entity hierarchy.

## Decision

### Canonical hierarchy

```
User → Organization → Project → Asset → Version
```

### UI label → entity mapping

| UI term | Entity | Note |
|---------|--------|------|
| Organization | `organizations` table | The tenant |
| Project | `projects` table | Media room belonging to an Organization |
| Asset | `assets` table (future) | A media file in a Project |
| Version | `asset_versions` table (future) | An immutable snapshot of an Asset |

### Term "workspace" is banned

- **Source code**: no variable, type, function, class or module may use "workspace".
- **UI text**: all labels, descriptions and aria-labels use "organization".
- **Routes**: frontend paths use `/organizations/[slug]`, never `/workspaces/`.
- **API**: endpoint paths and response fields use `organization`, not `workspace`.
- **Tests**: test names and descriptions use "organization".
- **Allowlist**: only Alembic migration history files (`migrations/versions/`) may retain
  the word in comments or column names that were part of prior migrations.

### Role namespace

- `users.platform_role`: `user | support | super_admin`
- `organization_members.organization_role`: `owner | admin | member`
- `project_members.project_role` (future): `manager | editor | reviewer | viewer`

### Three dashboard contexts

1. **Global Dashboard** (`/app`) — lists user's Organizations
2. **Organization Dashboard** (`/app/organizations/[slug]`) — overview, projects, members
3. **Project Dashboard** (`/app/organizations/[slug]/projects/[id]`) — media, reviews

Asset/Review view is content within Project Dashboard, not a fourth dashboard.

## Consequences

- All "workspace" references in source, UI and routes must be replaced.
- `has_workspace` field in `CurrentUserResponse` becomes `has_organization`.
- `organization_members.role` column becomes `organization_members.organization_role`.
- `create_owner_workspace` method becomes `create_with_owner`.
- Frontend route hierarchy changes from `/dashboard` to `/app`.
- API project endpoints move from flat `/projects` to nested `/organizations/{id}/projects`.
