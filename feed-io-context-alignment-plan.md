# Feed.io Context Alignment Plan

## Goal

Synchronize database schemas, backend services, API contracts, frontend interfaces, and routing URLs to a unified domain vocabulary: `User → Organization → Project → Asset → Version`. Avoid using "Workspace" as an ambiguous alias for "Organization".

## Canonical Contexts

| Context | Canonical Aggregates / Roles | Boundary |
|---|---|---|
| Platform | `User`, `PlatformRole` | Feed.io platform administration; does not implicitly bypass tenant boundaries |
| Global Dashboard | `User` + `OrganizationMember` projection | User portal view; not a separate database aggregate |
| Organization Dashboard | `Organization`, `OrganizationMember`, `Project` | Tenant management view for a specific agency/studio |
| Project Dashboard | `Project`, `ProjectMember`, `Folder`, `Asset`, `ShareLink` | Dedicated collaboration media room within an Organization |
| Media Review | `Folder`, `Asset`, `AssetVersion`, `MediaObject`, `Comment`, `Annotation`, `ReviewDecision` | Sub-resource view; always traces back to `organization_id` and `project_id` |

Default Role Namespaces:
- `users.platform_role`: `user | support | super_admin`
- `organization_members.organization_role`: `owner | admin | member | viewer`
- `project_members.project_role`: `manager | editor | reviewer | viewer`
- Platform administrators do not receive automatic read access to tenant assets; support sessions require an explicit reason, expiration, and audit trail.

## Implementation Tasks

- [x] **1. Finalize ADR & Glossary:** Enforce "Organization" across DB, backend, API, frontend, and URLs (`User → Organization → Project → Asset → Version`).
- [x] **2. Standardize Scoped Roles:** Add `users.platform_role`, rename `organization_members.role → organization_role`, adopt `project_role` for project members.
- [x] **3. Scope-Based Authorization Guards:** Implement `require_platform_role`, `require_organization_permission`, and `require_project_permission`.
- [x] **4. Global API Projection:** `GET /organizations` returns all organizations where the user holds active membership; pass organization context explicitly in nested routes.
- [x] **5. URL Hierarchy Alignment:** `/app` for Global Dashboard, `/app/organizations/[organizationSlug]` for Organization Dashboard, with projects and assets nested under organization slugs.
- [x] **6. Three Distinct Dashboard Shells:** Global (manages organizations), Organization (manages projects/members), Project (manages media assets/review).
- [x] **7. Context-Aware Navigation Sidebars:** Dynamic sidebar navigation reflecting Global, Organization, or Project scopes.
- [x] **8. Frontend State & Cache Scoping:** Scope query keys and Axios requests by `organizationId`/`projectId` to prevent cache leakage across organizations.
- [x] **9. Relational Integrity Enforcement:** Prevent cross-tenant record linking via composite foreign keys `(organization_id, parent_id)`.
- [x] **10. Contract Synchronization & Verification:** Regenerate OpenAPI/Orval clients, update documentation indices, and verify cross-tenant denial tests.

## Definition of Done

- `Organization` is the sole tenant term across database models, backend APIs, frontend components, and URLs.
- The three primary views (`/app`, Organization Dashboard, Project Dashboard) maintain strict visual and functional separation.
- Roles and permissions strictly declare their scope (Platform, Organization, or Project).
- Cross-tenant data leakage is structurally impossible across the API, frontend cache, and database layers.
