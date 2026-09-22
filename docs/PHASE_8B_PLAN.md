# Detailed Implementation Plan: Phase 8B — Video Version Stacking & Comparison

This document specifies the technical architecture, database schema, API contracts, UI/UX interaction flows, and comprehensive verification scenarios for **Phase 8B: Video Version Stacking & Side-by-Side Comparison** of the Feed.io platform.

---

## 🎯 Phase 8B Business Objectives

1. **Version Stacking**:
   - Upload new iterations (v1, v2, v3, final) attached directly to an existing Video Asset container.
   - Combine independent video assets into a version stack via Drag & Drop or contextual action menus.
   - Manage version stacks: assign version labels (*Rough Cut*, *Color Graded*, *Director's Cut*), designate the *Primary Version*, unstack versions back into independent assets, or delete specific versions.
2. **Flexible Media Grid Experience**:
   - In the Project Grid/Kanban, all versions of a video default to a single collapsed representative card featuring a layered visual effect and a version badge (e.g., `V3 (3 versions)`), preventing screen clutter.
   - Provide a toolbar toggle: **"Group Stacks"** (default on) vs. **"Show All Files"** (ungrouped).
3. **Synchronized Dual Playback Engine**:
   - Drive two concurrent video streams using a single Master Timecode Clock.
   - Synchronous Play/Pause, Scrubber seeking, and Frame Stepping (Arrow keys, J-K-L) with frame-accurate precision.
   - Frame Offset Alignment allowing editors to compensate for intro trimming or shifted start timecodes.
4. **3 Visual Comparison Modes**:
   - **Side-by-Side (50/50)**: Two viewports displayed side-by-side.
   - **Split-Screen Wipe Slider**: Single viewport with a vertical curtain wipe slider for pixel-level comparisons between versions.
   - **Difference / Onion Skin Overlay**: CSS difference blend mode highlighting altered visual effects, color grades, and graphics.
5. **Audio Routing & Version-Isolated Comments**:
   - Seamlessly toggle audio monitoring between Version A, Version B, or Mute.
   - Comments and review approval decisions remain tied to specific version IDs (`media_id`), preserving authentic audit trails for each cut.

---

## 🏛️ Phase 8B System Architecture

```mermaid
flowchart TD
    subgraph Frontend["Frontend: apps/web"]
        PG[Project Grid: Stacked Card UI]
        VSD[Version Stack Manager Dialog]
        subgraph DualPlayer["Version Compare Workspace"]
            MC[Master Clock & Sync Controller]
            VA[Video Player A - Master]
            VB[Video Player B - Follower]
            CS[Curtain Wipe / Difference Canvas]
            AR[Audio Routing Selector]
            MC -->|Seek / Play / Pause| VA
            MC -->|Sync Drift Correction| VB
            VA & VB --> CS
            VA & VB --> AR
        end
    end

    subgraph Backend["Backend: apps/backend"]
        VR[Versions API Router]
        VSC[Version Stacking Command Service]
        MR[(SqlMediaRepository)]
        Q[Celery Transcoding Pipeline]
        WS[Realtime Event Publisher]
    end

    PG -->|Drag & Drop Stack| VR
    VSD -->|Set Primary / Unstack| VR
    DualPlayer -->|Fetch Stream URLs & Versions| VR
    VR --> VSC --> MR
    VSC -->|Publish version.created / stacked| WS
    VSC -->|Trigger HLS transcode| Q
    WS -->|Realtime sync| Frontend
```

---

## 🗄️ Database Schema & Migration Specification

### 1. Schema Enhancements on `media_assets`

The database schema includes `version_group_id` (UUID) and `version_number` (int). Phase 8B adds:

```sql
-- Migration: 20260915_0017_enhance_media_versioning.py
ALTER TABLE media_assets
ADD COLUMN version_label VARCHAR(100) NULL,
ADD COLUMN is_primary_version BOOLEAN NOT NULL DEFAULT FALSE;

-- Index for rapid version lookup ordered by version number
CREATE INDEX ix_media_assets_version_group_number 
ON media_assets (version_group_id, version_number ASC)
WHERE deleted_at IS NULL;

-- Index for project grid grouping queries (filtering primary versions)
CREATE INDEX ix_media_assets_primary_version 
ON media_assets (organization_id, project_id, is_primary_version)
WHERE deleted_at IS NULL;
```

### 2. Business Integrity Rules:
- When an asset is first uploaded: `version_group_id = NULL`, `version_number = 1`, `is_primary_version = TRUE`.
- Upon creating a new version (or stacking assets):
  - All versions share the identical `version_group_id`.
  - `version_number` increments sequentially (1, 2, 3...).
  - Exactly **one version** holds `is_primary_version = TRUE` within any `version_group_id` (typically the latest version).
- Unstacking an asset: The detached asset receives `version_group_id = NULL`, `version_number = 1`, `is_primary_version = TRUE`.

---

## 🔌 API Endpoint Specifications

All endpoints are mounted under prefix:  
`/api/v1/organizations/{organization_id}/projects/{project_id}/media`

| Method | Endpoint | Authorization | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/{media_id}/versions/presign-upload` | Owner, Admin, Editor | Initialize upload session for new version |
| `POST` | `/{media_id}/versions/complete` | Owner, Admin, Editor | Finalize upload, increment `version_number`, bind `version_group_id` |
| `POST` | `/stack` | Owner, Admin, Editor | Combine 2 independent assets into a stack (`target_id` + `source_id`) |
| `POST` | `/{media_id}/unstack` | Owner, Admin, Editor | Detach version from stack into independent asset |
| `POST` | `/{media_id}/set-primary` | Owner, Admin, Editor | Designate version as the stack's primary thumbnail/view |
| `PATCH`| `/{media_id}/version-label` | Owner, Admin, Editor | Update custom version label (e.g. "Color Graded Final Cut") |
| `GET`  | `/{media_id}/versions` | All Members | Retrieve complete list of versions in the stack |
| `GET`  | `/` (query param) | All Members | Query supports `group_versions: bool = true` to return only primary versions |

### Request & Response Schemas:

```python
class CreateVersionUploadRequest(BaseModel):
    filename: str = Field(min_length=1, max_length=255)
    file_size_bytes: int = Field(ge=1)
    mime_type: str = Field(min_length=3, max_length=100)
    version_label: str | None = Field(default=None, max_length=100)
    duration_seconds: float | None = None
    width: int | None = None
    height: int | None = None
    has_thumbnail: bool = False

class StackMediaRequest(BaseModel):
    target_media_id: UUID = Field(description="Target media asset retaining v1 or existing stack")
    source_media_id: UUID = Field(description="Source media asset dragged in to become the new version")

class UpdateVersionLabelRequest(BaseModel):
    version_label: str = Field(min_length=1, max_length=100)

class VersionSummaryResponse(BaseModel):
    id: UUID
    version_number: int
    version_label: str | None
    title: str
    status: str
    review_status: str
    is_primary: bool
    created_at: datetime
```

---

## 🎨 Frontend UI/UX Architecture (`apps/web`)

### 1. Version Stacking in Project Grid (`media_card.tsx`)
- **Stacked Card Visual Treatment**:
  - When an asset has `version_count > 1`, a layered shadow card outline renders behind the primary card.
  - Distinctive badge: `V3 (3 versions)`.
- **Drag & Drop Stacking with Confirmation Guard**:
  - Dragging one video card onto another opens `StackConfirmDialog`.
  - Displays thumbnail previews of both cuts, shows resulting version numbering (`V2`, `V3`), and accepts an optional version label. Action only executes upon clicking *"Confirm Stack"*, eliminating accidental drops.
- **Grid Grouping Toggle**:
  - Toolbar toggle: **"Group Stacks"** (default) vs. **"Show All Files"**.
- **Version Stack Management Dialog**:
  - Lists thumbnails, upload timestamps, contributors, and review decisions for all iterations.
  - 1-Click *"Set as Primary"*.
  - 1-Click *"Unstack"* to detach files.
  - Direct *"Upload New Version"* button.

### 2. Dual Comparison Workspace (`VersionCompareWorkspace`)
Mounted inside Review Workspace via toggle: **[ Single View | Compare Versions ]** or keyboard shortcut `C`.

```text
+-----------------------------------------------------------------------------------+
| < Back to Project   [V3: Final Color Grade v] vs [V2: Rough Cut v]    [Sync: 0.00s]|
+-----------------------------------------+-----------------------------------------+
|                                         |                                         |
|             VERSION A (V3)              |             VERSION B (V2)              |
|        [Approved] 00:01:24:12           |      [Needs Changes] 00:01:24:12        |
|                                         |                                         |
+-----------------------------------------+-----------------------------------------+
| Mode: (•) Side-by-Side  ( ) Wipe Slider  ( ) Difference    Audio: (•) A  ( ) B     |
| [Play/Pause] [|< Frame] [Frame >|]  ====[o]========================= 00:01:24:12  |
| Timeline Markers: • A-Comment (00:01:10)   • B-Comment (00:01:24)                |
+-----------------------------------------------------------------------------------+
```

#### Comparison Modes:
1. **Side-by-Side (50/50)**:
   - Parallel viewports adapting dynamically to standard aspect ratios (16:9 / 9:16).
   - Independent headers showing version labels and review decision badges.
2. **Split-Screen Wipe Slider**:
   - Dual videos stacked with absolute positioning in a single viewport.
   - Video B serves as base layer; Video A renders with dynamic CSS `clip-path: polygon(0 0, {wipePos}% 0, {wipePos}% 100%, 0 100%)`.
   - Interactive vertical divider allows scrubbing from 0% to 100% to examine pixel deltas.
3. **Difference Overlay Mode**:
   - Applies CSS `mix-blend-mode: difference;`.
   - Identical pixels appear jet black; grade changes and VFX revisions glow vibrantly.

#### Master Clock Synchronization:
- React hook `useSynchronizedPlayback`:
  - Designates Video A as **Master Clock**.
  - `onTimeUpdate` continuously synchronizes `currentTime` to Video B.
  - If drift $|time_A - time_B| > 0.04s$ (exceeding 1 frame at 24fps), automatic seek correction engages.
  - Supports `frame_offset` allowing $\pm N$ frame offsets when cuts start at different points.

---

## 📁 File Structure & Implementation Scope

### Backend (`apps/backend`):
```text
src/feedio/modules/media/
├── domain/
│   ├── entities.py                       # [MODIFY] version_label, is_primary_version in MediaAsset
│   └── errors.py                         # [MODIFY] VersionStackNotFoundError, InvalidVersionOperationError
├── infrastructure/
│   ├── models.py                         # [MODIFY] MediaAssetTable columns & indices
│   └── repository.py                     # [MODIFY] stack_media, unstack_media, set_primary_version
├── application/
│   ├── commands/
│   │   ├── stack_media.py                # [NEW] Stack two media assets command
│   │   ├── unstack_media.py              # [NEW] Unstack version command
│   │   ├── set_primary_version.py        # [NEW] Designate primary version command
│   │   └── update_version_label.py       # [NEW] Rename version label command
│   └── queries/
│       └── get_version_stack.py          # [NEW] Query full stack metadata
└── presentation/
    ├── schemas.py                        # [MODIFY] Stacking, unstacking, label schemas
    └── versions_router.py                # [MODIFY] Endpoints for version management & comparison
```

### Frontend (`apps/web`):
```text
src/modules/
├── media/
│   ├── components/
│   │   ├── media_card.tsx                # [MODIFY] Stacked card styling & drag-drop target
│   │   ├── version_stack_dialog.tsx      # [NEW] Stack management modal (Reorder, unstack, label)
│   │   └── upload_version_dialog.tsx     # [NEW] Direct new version upload dialog
│   └── hooks/
│       └── use_version_stack.ts          # [NEW] React Query hooks for stack operations
└── review/
    └── components/
        └── compare/
            ├── version_compare_workspace.tsx # [NEW] Version comparison workspace
            ├── synchronized_dual_player.tsx  # [NEW] Dual video player with master clock
            ├── wipe_slider_view.tsx          # [NEW] Split-screen wipe slider view
            ├── difference_overlay_view.tsx   # [NEW] Difference blend mode view
            └── compare_control_bar.tsx       # [NEW] Comparison toolbar (Mode, Offset, Audio)
```

---

## 📅 Step-by-Step Delivery Roadmap

1. **Step 1: Database Migration & Repository Update**
   - Apply migration adding `version_label` and `is_primary_version`.
   - Implement `stack_media()`, `unstack_media()`, `set_primary_version()` in repository.
2. **Step 2: Backend Use Cases & API Endpoints**
   - Implement commands: `StackMedia`, `UnstackMedia`, `SetPrimaryVersion`, `UpdateVersionLabel`.
   - Wire endpoints into `versions_router.py`.
   - Publish real-time events (`media.version_created`, `media.stacked`, `media.unstacked`).
3. **Step 3: Frontend Version Stacking UI (Project Grid)**
   - Update `media_card.tsx` with stacked card visual and version badge.
   - Add Drag & Drop stacking between cards with `StackConfirmDialog`.
   - Implement `version_stack_dialog.tsx` and `upload_version_dialog.tsx`.
4. **Step 4: Frontend Dual Synchronized Playback Engine**
   - Implement `useSynchronizedPlayback` managing master clock, frame-accurate play/pause, seek, and offset.
   - Implement `synchronized_dual_player.tsx`.
5. **Step 5: Visual Comparison Modes**
   - Implement **Side-by-Side** view.
   - Implement **Split-Screen Wipe Slider** view.
   - Implement **Difference Overlay** view.
   - Add Audio Routing Selector (Audio A / Audio B).
6. **Step 6: Testing & Quality Verification**
   - Unit tests for backend commands (`pytest`).
   - Contract tests for version APIs (`TestClient`).
   - Component tests for dual playback and wipe slider (`vitest`).
   - End-to-end user flow: Upload v1 ➔ Upload v2 ➔ Drag-and-drop stack ➔ Open Compare Mode ➔ Scrub wipe slider ➔ Verify audio switching and timecode alignment.
