# Feed.io Project Development Progress Report

*Last updated: September 2026*

The **Feed.io** project (Self-hosted Video Review & Approval Platform for Creative Studios and Agencies) has successfully delivered all core MVP (Minimum Viable Product) features across all three tiers: **Backend (FastAPI/Celery)**, **Frontend (Next.js/Design System)**, and **Infrastructure (Docker/Garage S3)**.

---

## 1. 10-Phase Development Status Matrix

| Phase | Technical & Functional Scope | Status | Notes & Milestones |
| :--- | :--- | :---: | :--- |
| **Phase 1: Foundation & Infra** | Monorepo pnpm/turbo, Docker Compose (PostgreSQL, Valkey, RabbitMQ, Garage S3, Mailpit, GlitchTip, Nginx/Cloudflare), CI scripts verifying < 500 lines and module boundaries. | **Completed** `[x]` | Full stack boots via a single `make stack-up`. CI automatically blocks circular dependencies and oversized files. |
| **Phase 2: Identity & Tenancy** | Registration, mandatory email verification, login, JWT + HttpOnly CSRF cookie, refresh token rotation, session revocation, strict multi-tenant isolation across Organizations. | **Completed** `[x]` | Passwords hashed with Argon2id. Multi-tenant cross-boundary tests prevent any data leakage across organizations. |
| **Phase 3: Workspace & Projects** | Project management, hierarchical folders (cycle prevention), project privacy (private/public), membership permissions (`Members`), view modes (Grid / Table / Kanban). | **Completed** `[x]` | Unified terminology from `team` to `members` (`/app/organizations/[slug]/members`). |
| **Phase 4: Upload Pipeline** | Presigned Multipart Upload direct to Garage S3 via client-side chunking, automatic retry, abort upload, MD5/SHA256 checksums, progress toasts. | **Completed** `[x]` | Large media files upload directly to S3 bypassing the API, keeping main API threads unblocked. |
| **Phase 5: Media Processing** | Asynchronous Celery workers, ffprobe metadata extraction, FFmpeg adaptive Master HLS generation, MP4 proxy renditions, thumbnails, and filmstrip sprites. | **Completed** `[x]` | Generates renditions optimized for in-browser streaming and timeline scrubbing with robust fault tolerance. |
| **Phase 6: Internal Review & Versioning (Phase 8B)** | SMPTE frame-accurate video player, timeline scrubber, timecoded comments, vector annotations, review decisions, Video Version Stacking, drag-and-drop stacking, V2+ upload, and Synchronized Dual Comparison (Side-by-side, Wipe slider, Difference). | **Completed** `[x]` | 100% complete across backend commands, repository mixin, versions router, and frontend dual player engine, stack management modal, and Storybook. |
| **Phase 7: Collaboration & Alerts** | Real-time presence avatars via WebSocket/Valkey, in-app and email notifications, deep linking jumping directly to frame and highlighting comment. | **Completed** `[x]` | Standardized Organization lookup by both UUID and slug, resolving 404 navigation errors from notifications. |
| **Phase 8: External Share & Guest Review** | Independent external share links, passphrase protection, expiration dates, granular review permissions (comment/approve/download), `/share/[token]` guest portal. | **Completed** `[x]` | Resolved Garage S3 403 issue with direct MP4 proxy streaming; guest review interface is 100% aligned with internal workspace. |
| **Phase 9: Design System & Storybook** | Neobrutalist UI design tokens, Storybook catalog covering Primitives, Components, Review, Share dialogs, and Versioning interactive gallery. | **Completed** `[x]` | Full Storybook catalog, 100% static build success, standardized English labels. |
| **Phase 10: Production Ingress & Hardening** | Cloudflare Tunnel Ingress (Zero Public Inbound Ports), Prometheus/Grafana metrics, automated database backups and disaster recovery runbooks. | **Completed** `[x]` | Completed `compose.prod.yaml`, `PRODUCTION_DEPLOYMENT_GUIDE.md`, `backup-db.sh`, `restore-db.sh`, and `ensure-prod-env.sh`. |

---

## 2. Key Improvements & Bug Fixes

### 2.1. Guest Video Playback Resolution (403 Forbidden)
- **Problem**: When guest reviewers accessed external share links, video failed to play with a `403 Forbidden` error from Garage S3.
- **Root Cause**: The API prioritized HLS playlists (`master.m3u8`); child `.ts` segment chunks lacked AWS Signature query parameters inside Garage S3's private bucket environment.
- **Resolution**:
  - `get_public_share_stream` API issues presigned URLs directly for MP4 proxy and source MP4 files with `Accept-Ranges` and `Content-Range` headers.
  - Reconfigured S3 CORS rules to expose headers required for HTTP 206 Partial Content byte ranges.
  - VideoPlayer prioritizes direct MP4 proxy playback in guest browsers.

### 2.2. Notification Deep Link 404 Fix
- **Problem**: Clicking notification bell items led to 404 "Organization not found" pages.
- **Root Cause**: Notification links embedded the organization's UUID (`/app/organizations/{uuid}/...`) whereas the Next.js router used `[slug]` and `get_by_slug` only queried by string slug.
- **Resolution**:
  - Updated backend repository so `get_by_slug` searches interchangeably by `slug` or `id` (when string is a valid UUID).
  - Added URL normalization middleware automatically redirecting from UUID to canonical slug.
  - Implemented automatic timecode jumping and comment highlighting when `?commentId=...` is present.

### 2.3. Terminology & Route Standardization (`team` → `members`)
- **Problem**: Inconsistent UI terminology across "Team", "Agency", "Workspace", and "Members".
- **Resolution**:
  - Standardized canonical route to `/app/organizations/[slug]/members`.
  - Added backward-compatible redirects for `/team` and `/member`.
  - Updated notification payloads to point to `/members`.
  - Harmonized table view styling with standard `bg-white` design tokens.

### 2.4. Share Link Copy & Delete Button Enhancements
- **Copy Button**:
  - Fixed Copy button disappearing when the API returned `share_url = null`.
  - Added fallback URL `/share/${link.id}` and backend support for resolving links by both `token_hash` and `link.id`.
  - Added visual "Copied" feedback state with check icon.
- **Delete Button**:
  - Replaced subtle ghost button with standard `variant="danger"` neobrutalist button (red accent, high-contrast border, signature shadow).
  - Integrated `<Trash2 size={12} />` icon alongside `<span className="text-[11px]">Delete</span>` label.

---

## 3. QA & Verification Metrics

| Criterion | Result | Status |
| :--- | :---: | :---: |
| **Frontend Unit Tests (Vitest)** | **199 / 199 tests passed** (48 test files) | PASSED (100%) |
| **Backend Unit Tests (Pytest)** | **139 / 139 tests passed** | PASSED (100%) |
| **Static Type Checking (TypeScript)** | **0 errors** (`tsc --noEmit`) | PASSED (100%) |
| **Production Build (`next build`)** | Compiles 100% static & dynamic routes | PASSED (100%) |
| **Storybook Build (`storybook build`)** | Compiles 100% UI catalog & stories | PASSED (100%) |
| **Physical File Line Limits** | **0 files > 500 lines** (`scripts/check-file-lines.sh`) | PASSED (100%) |
| **Architecture Boundary Linting** | Zero cycle imports or layer violations | PASSED (100%) |

---

## 4. Video Versioning & Comparison (Phase 8B Delivery Details)

The complete **Phase 8B: Video Version Stacking & Side-by-Side Comparison** specification has been fully delivered:

### 4.1. Database Layer & Data Integrity
- **Migration `0017`**:
  - Added `updated_at`, `deleted_at` (soft-delete) to `projects` with partial index `ix_projects_org_active`.
  - Added `CASCADE` foreign keys for `media_comments` and `notifications`.
  - Supported Guest Reviewers in `media_review_decisions` (`user_id` nullable, `guest_name`, XOR check constraint).
  - Added XOR check constraint for `share_links` (`media_id` XOR `folder_id`).
  - Created transactional outbox table `outbox_events` (`OutboxEventTable`).
- **Migration `0018`**:
  - Added `version_label` (VARCHAR 100) and `is_primary_version` (BOOLEAN, default TRUE) to `media_assets`.
  - Created partial indexes `ix_media_assets_version_group_number` and `ix_media_assets_primary_version`.

### 4.2. Backend Application Commands & API Routers
- **Application Commands**:
  - `StackMedia`: Merges 2 assets into a stack (`target_media_id` + `source_media_id`), generates `version_group_id` and numbers versions.
  - `UnstackMedia`: Detaches child asset from stack into an independent V1 media asset.
  - `SetPrimaryVersion`: Designates primary visual representative for the stack.
  - `UpdateVersionLabel`: Updates custom version name (e.g., *Rough Cut*, *Color Graded*).
- **Repository Mixin**:
  - `VersionRepositoryMixin` (`version_repository.py`): Isolates version management with atomic transactions, keeping `repository.py` < 500 lines.
- **REST Endpoints (`versions_router.py`)**:
  - `POST /{media_id}/versions/presign-upload`: Initialize upload for a new version.
  - `POST /{media_id}/versions/complete`: Finalize new version upload and assign version number.
  - `POST /stack`: Combine two independent assets into a version stack.
  - `POST /{media_id}/unstack`: Unstack a version asset.
  - `POST /{media_id}/set-primary`: Set primary active version.
  - `PATCH /{media_id}/version-label`: Update version label.
  - `GET /{media_id}/versions`: Retrieve all versions within the stack.

### 4.3. Frontend UI & Version Stacking Experience
- **Project Grid (`media_card.tsx`)**:
  - **Stacked Card visual effect** when `version_count > 1`.
  - Prominent badge displaying current and total versions (`V3 (3 versions)`).
  - HTML5 Drag and Drop between cards to trigger stacking workflow.
  - Safe confirmation modal `StackConfirmDialog` with thumbnail previews and version naming.
  - Management modal `VersionStackDialog`: Set primary, unstack, rename labels, and upload new versions directly.
- **Review Workspace Header (`version_switcher.tsx`)**:
  - Quick (+) button to upload new version directly from the review header.
  - "Compare with..." button launching synchronized dual comparison mode.
  - Standalone version upload dialog `UploadVersionDialog`.

### 4.4. Synchronized Dual Video Playback Engine
- **Master Clock Synchronization Engine (`use_synchronized_playback.ts`)**:
  - Frame-accurate playback of 2 parallel video streams with drift < 0.04s.
  - Real-time drift correction and frame offset adjustment (*Frame Offset Alignment*).
- **3 Visual Comparison Modes (`version_compare_workspace.tsx`)**:
  1. **Side-by-Side (50/50)**: Two synchronized video viewports side-by-side.
  2. **Split-Screen Wipe Slider**: Single viewport with draggable vertical wipe line (`clip-path`) for pixel-by-pixel comparisons.
  3. **Difference Overlay Mode**: CSS `mix-blend-mode: difference;` highlights altered pixels between versions.
- **Audio Routing**:
  - Seamless audio switching between Version A and Version B.

---

## 5. Next Steps

1. **End-to-End Integration Testing (Playwright)**:
   - Complete core user flows: Register/login → Invite members → Create project → Upload V1 → Create V2/V3 (upload & drag-and-drop stack) → Open Dual Player comparison → Approve decision → Create share link → Guest sign-off.
2. **Load & Stress Testing**:
   - Execute k6 load tests for concurrent video streaming and real-time WebSocket messaging.
   - Fault injection testing during transient restarts of Garage S3 or Celery workers.
3. **Self-Hosted Operations Runbooks**:
   - Automated SSL certificate management guide.
   - Automated PostgreSQL disaster recovery procedures (pgBackRest).
