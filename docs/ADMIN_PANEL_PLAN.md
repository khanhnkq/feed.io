# Platform Admin Panel Integration Plan for Feed.io

This document provides a comprehensive specification of the architecture, user interface, reusable component system, design tokens, and Storybook stories for the Feed.io **Platform Admin Panel**.

---

## 1. Objectives & Scope

1. **Comprehensive Platform Administration:**
   - Supports privileged administrative roles (`platform_role = 'super_admin'`) and customer support engineers (`platform_role = 'support'`).
   - Delivers four core management sub-systems:
     - **Overview / Metrics:** Infrastructure health monitoring (PostgreSQL, Valkey, RabbitMQ, S3 Garage, Rate Limiter) & platform KPIs.
     - **Users Management:** User roster management, platform role delegation (`user`, `support`, `super_admin`), and account suspension/reactivation.
     - **Organizations & Workspaces:** Multi-tenant workspace governance, storage quota allocation, and plan tiers.
     - **Audit Logs & Security:** Detailed audit trails of sensitive operations, security incidents, and rate-limiting anomalies.

2. **Strict Design Standards & Component Reuse:**
   - **100% Reuse of Shared UI Components** from `@/modules/ui`: `Card`, `Table`, `Badge`, `Button`, `Tabs`, `Dialog`, `Dropdown`, `FilterToolbar`, `ProgressBar`, `Avatar`, `Tooltip`. Never duplicate existing components!
   - **Tailwind CSS v4 Token Adherence:**
     - Surfaces: `bg-paper` (`#f3f3ed`), `bg-surface` (`#fbfbf7`).
     - Typography: `text-ink` (`#11130f`), `text-muted` (`#73766d`).
     - Borders: `border-line` (`#dedfd8`).
     - Accents & Status: `bg-lime` (`#d8ff43`), `text-orange` (`#ff9d62`), `text-cyan` (`#81dce2`), `text-lilac` (`#c9c6ff`).
   - **Visual Verification via Storybook:** Complete `*.stories.tsx` coverage for every tab and the unified Admin Panel screen covering multiple realistic scenarios (Super Admin, Support, High Load, Empty States, Modal Dialogs).

---

## 2. Module Architecture (`apps/web/src/modules/admin/`)

```text
apps/web/src/modules/admin/
├── types.ts                                # TypeScript domain models for Admin Panel
├── lib/
│   └── mock_data.ts                        # Rich realistic mock datasets for Storybook & local dev
├── components/
│   ├── admin_screen.tsx                    # Primary shell: Header, Navigation Tabs, RBAC Guard
│   ├── overview_tab.tsx                    # Infrastructure health and platform KPI dashboard
│   ├── users_tab.tsx                       # User administration, role modification, account status
│   ├── organizations_tab.tsx               # Organization management & S3 storage quota adjustments
│   ├── audit_logs_tab.tsx                  # Historical operations & security audit trails
│   ├── admin_screen.stories.tsx            # Full Admin Screen Storybook suite
│   ├── overview_tab.stories.tsx            # Overview Tab Storybook stories
│   ├── users_tab.stories.tsx               # Users Tab & Dialog Storybook stories
│   ├── organizations_tab.stories.tsx       # Organizations Tab Storybook stories
│   ├── audit_logs_tab.stories.tsx          # Audit Logs Tab Storybook stories
│   └── admin_screen.test.tsx               # Vitest component tests (render, RBAC guard, interactions)
└── index.ts                                # Public module export barrel
```

---

## 3. UI Component Reuse Map

| Admin UI Area | Shared `@/modules/ui` Component | Purpose | Color Tokens |
| :--- | :--- | :--- | :--- |
| **KPI & Health Cards** | `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardBadge` | User count metrics, S3 usage stats, service availability | `bg-surface`, `border-line`, `text-ink`, `bg-lime` |
| **Storage Quota Bar** | `ProgressBar` | % of S3 Garage storage used per organization | `bg-paper`, `bg-lime`, `bg-red-600` (>90%) |
| **Data Tables** | `TableContainer`, `Table`, `TableHeader`, `TableHead`, `TableBody`, `TableRow`, `TableCell` | User rosters, organization lists, audit log records | `bg-surface`, `border-line`, `text-muted`, `text-ink` |
| **Empty State** | `TableEmptyState` | Filter queries with zero results or empty tables | `bg-surface/60`, `border-line`, `text-muted` |
| **Search & Filtering** | `FilterToolbar` | Realtime search by name/email, counter, sorting, role filter | `bg-surface`, `bg-paper`, `text-ink`, `border-line` |
| **Navigation Tabs** | `Tabs` (variant="pills") | Switching between Overview, Users, Orgs, and Logs | `bg-lime`, `border-ink`, `text-ink`, `text-muted` |
| **Role & Status Tags** | `Badge` | Labels: `SUPER ADMIN` (`lime`), `SUPPORT` (`cyan`), `ACTIVE` (`success`), `SUSPENDED` (`danger`) | `lime`, `cyan`, `success`, `danger`, `surface` |
| **Action Buttons** | `Button` | Modify role, suspend user, export report, refresh | `primary` (`bg-ink`), `outline`, `danger`, `lime` |
| **Row Action Menu** | `Dropdown`, `DropdownTrigger`, `DropdownMenu`, `DropdownItem`, `DropdownSeparator` | Contextual "..." action menu for each user/organization | `border-line`, `bg-surface`, `bg-paper` |
| **Confirmation Modals** | `Dialog`, `DialogHeader`, `DialogEyebrow`, `DialogTitle`, `DialogDescription`, `DialogBody`, `DialogFooter`, `DialogCloseButton` | Modal for `platform_role` change, modal for quota update | `bg-surface`, `border-line`, `backdrop-blur-sm` |
| **User Avatars** | `Avatar` | User profile avatars in tables and audit trails | `tone="dark"`, `tone="lime"`, `tone="surface"` |

---

## 4. Implementation Phases

### Phase 1: Module Setup, Types & Mock Data Engine
- Define core interfaces in `apps/web/src/modules/admin/types.ts`:
  - `AdminPlatformRole = 'user' | 'support' | 'super_admin'`
  - `AdminUserStatus = 'active' | 'suspended'`
  - `AdminUser`, `AdminOrganization`, `SystemHealthStatus`, `PlatformMetrics`, `AdminAuditLog`
- Build realistic mock dataset engine in `apps/web/src/modules/admin/lib/mock_data.ts` modeling actual users, organizations, and infrastructure telemetry.

### Phase 2: Implement Admin UI Tab Components
- **Tab 1: `OverviewTab`**:
  - 4 major KPI cards: Total Users, Active Organizations, Total S3 Video Storage, System Throughput (Req/s & Rate Limit Health).
  - Service Health Grid: PostgreSQL, Valkey Cache, RabbitMQ Queue, Garage S3, Cloudflare Tunnel Ingress Gateway.
  - Storage breakdown: Raw Source Media, Transcoded Proxies, Waveform Visualizer Cache.
- **Tab 2: `UsersTab`**:
  - `FilterToolbar` with real-time text query, Role dropdown filter (`All`, `Super Admin`, `Support`, `User`), and Status filter (`Active`, `Suspended`).
  - `Table` displaying user avatar, name, email, platform role `Badge`, workspace membership count, registration date, and status.
  - `Dialog` for updating platform permissions (`ChangePlatformRoleDialog`).
  - `Dialog` for account suspension confirmation (`SuspendUserDialog`).
- **Tab 3: `OrganizationsTab`**:
  - Organizations table showing plan tier (`Free`, `Pro`, `Enterprise`), storage `ProgressBar`, member counts, and project totals.
  - `Dialog` for modifying S3 storage limits (`AdjustQuotaDialog`).
- **Tab 4: `AuditLogsTab`**:
  - Security audit trail table: timestamp, actor, event (`USER_ROLE_CHANGED`, `USER_SUSPENDED`, `STORAGE_QUOTA_INCREASED`, `RATE_LIMIT_BLOCKED`), source IP, status.

### Phase 3: Screen Assembly, Access Control & Routing
- **`AdminScreen`**:
  - RBAC verification: `user.platform_role in ('support', 'super_admin')`.
  - Standard users: Render elegant 403 Forbidden state with `Card`, `Badge danger`, descriptive message, and `Return to App` button.
  - Tab state management and persistence.
- **AppShell Integration (`apps/web/src/modules/navigation/components/app_shell.tsx`)**:
  - Automatically display **"Admin Panel"** menu item with `Shield` icon in Global Navigation if `platform_role === 'super_admin' || platform_role === 'support'`.
- **Page Router (`apps/web/src/app/(app)/app/admin/page.tsx`)**:
  - Official `/app/admin` route mounting `<AdminScreen />`.

### Phase 4: Complete Storybook Visual Testing Suite
- Deliver 5 production-ready Storybook files:
  1. `admin_screen.stories.tsx`: Full Admin Screen (Super Admin view, Support view, 403 Forbidden view, Standalone mode).
  2. `overview_tab.stories.tsx`: Overview Tab (Nominal system health, High load / storage warning scenarios).
  3. `users_tab.stories.tsx`: Users Tab (Populated roster, Filtered search, Empty query result, Role change modal open).
  4. `organizations_tab.stories.tsx`: Organizations Tab (Multi-tier tenant list & Quota edit modal).
  5. `audit_logs_tab.stories.tsx`: Audit Logs Tab (Security incident and management action timeline).

### Phase 5: Verification & Quality Assurance
- Execute `pnpm build-storybook` to confirm zero compilation or import errors in stories.
- Run `pnpm test` / `vitest` covering admin UI components and RBAC guard logic.
- Run `pnpm typecheck` to ensure 100% clean TypeScript validation.
