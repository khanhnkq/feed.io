"use client";

import type { MediaResponse } from "@feedio/api-client";
import { client } from "@feedio/api-client";
import {
  Columns2,
  GitBranch,
  Layers,
} from "lucide-react";
import React, { useRef, useState } from "react";
import {
  MediaCard,
  StackConfirmDialog,
  VersionStackDialog,
} from "@/modules/media";
import {
  UploadVersionDialog,
  VersionCompareViewport,
  VersionCompareWorkspace,
  VersionSwitcher,
} from "@/modules/review";
import type { CompareMode } from "@/modules/review/hooks/use_synchronized_playback";
import { Button, Card } from "@/modules/ui";

const MOCK_VERSION_STACK: MediaResponse[] = [
  {
    id: "story-med-v1",
    organization_id: "org-demo",
    project_id: "proj-demo",
    title: "Brand_Commercial_V1.mp4",
    filename: "Brand_Commercial_V1.mp4",
    storage_key: "org-demo/proj-demo/v1.mp4",
    file_size_bytes: 12000000,
    mime_type: "video/mp4",
    status: "ready",
    duration_seconds: 24.0,
    width: 1920,
    height: 1080,
    fps: 24.0,
    version_group_id: "vg-demo-1",
    version_number: 1,
    version_label: "Rough Assembly Cut",
    is_primary_version: false,
    version_count: 3,
    thumbnail_storage_key: null,
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: "story-med-v2",
    organization_id: "org-demo",
    project_id: "proj-demo",
    title: "Brand_Commercial_V2.mp4",
    filename: "Brand_Commercial_V2.mp4",
    storage_key: "org-demo/proj-demo/v2.mp4",
    file_size_bytes: 14000000,
    mime_type: "video/mp4",
    status: "ready",
    duration_seconds: 24.0,
    width: 1920,
    height: 1080,
    fps: 24.0,
    version_group_id: "vg-demo-1",
    version_number: 2,
    version_label: "Color Grade & Sound Pass",
    is_primary_version: false,
    version_count: 3,
    thumbnail_storage_key: null,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: "story-med-v3",
    organization_id: "org-demo",
    project_id: "proj-demo",
    title: "Brand_Commercial_V3_Final.mp4",
    filename: "Brand_Commercial_V3_Final.mp4",
    storage_key: "org-demo/proj-demo/v3.mp4",
    file_size_bytes: 16000000,
    mime_type: "video/mp4",
    status: "ready",
    duration_seconds: 24.0,
    width: 1920,
    height: 1080,
    fps: 24.0,
    version_group_id: "vg-demo-1",
    version_number: 3,
    version_label: "Client Final Approved",
    is_primary_version: true,
    version_count: 3,
    thumbnail_storage_key: null,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
  },
];

const SAMPLE_VIDEO_A =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";
const SAMPLE_VIDEO_B =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4";

export function StoryboardVersioningSection() {
  const [isStackConfirmOpen, setIsStackConfirmOpen] = useState(false);
  const [isVersionStackOpen, setIsVersionStackOpen] = useState(false);
  const [isUploadVersionOpen, setIsUploadVersionOpen] = useState(false);
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);

  // Compare viewport state
  const [compareMode, setCompareMode] = useState<CompareMode>("wipe");
  const [wipePos, setWipePos] = useState(50);
  const videoARef = useRef<HTMLVideoElement | null>(null);
  const videoBRef = useRef<HTMLVideoElement | null>(null);

  // Setup client mocks for interactive dialog testing
  React.useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (client as any).get = async () => ({
      data: MOCK_VERSION_STACK,
      status: 200,
      statusText: "OK",
      headers: {},
      config: {},
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (client as any).post = async () => ({
      data: { success: true },
      status: 200,
      statusText: "OK",
      headers: {},
      config: {},
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (client as any).patch = async () => ({
      data: { success: true },
      status: 200,
      statusText: "OK",
      headers: {},
      config: {},
    });
  }, []);

  return (
    <section className="space-y-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2 text-lime font-mono text-xs font-bold uppercase tracking-wider">
          <GitBranch size={16} />
          <span>Module 8B • Video Version Stacking & Comparison</span>
        </div>
        <h2 className="text-2xl font-black tracking-tight text-ink">
          Media Versioning & Side-by-Side Comparison
        </h2>
        <p className="mt-1 text-sm text-muted">
          Interactive components for drag-drop stacking, stack management dialogs, and synchronized dual playback.
        </p>
      </div>

      {/* 1. Grid Cards & Stack Badges */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-ink flex items-center gap-2">
          <Layers size={18} className="text-lime" />
          <span>1. Media Grid Cards (Single vs Stacked with Badge & Layered Effect)</span>
        </h3>
        <p className="text-xs text-muted">
          Cards with <code>version_count &gt; 1</code> render layered shadows and a version stack badge <code>V3 (3)</code>.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
          <div>
            <span className="text-xs font-mono font-bold text-muted block mb-2">
              Single Asset (version_count = 1)
            </span>
            <MediaCard
              media={MOCK_VERSION_STACK[0]}
              onPlay={(m) => alert(`Play single: ${m.title}`)}
              onOpenReview={(m) => alert(`Review: ${m.title}`)}
              onEdit={(m) => alert(`Edit: ${m.title}`)}
              onMove={(m) => alert(`Move: ${m.title}`)}
              onDelete={(m) => alert(`Delete: ${m.title}`)}
            />
          </div>

          <div>
            <span className="text-xs font-mono font-bold text-muted block mb-2">
              Stacked Asset (version_count = 3, Primary V3)
            </span>
            <MediaCard
              media={MOCK_VERSION_STACK[2]}
              onPlay={(m) => alert(`Play stacked: ${m.title}`)}
              onOpenReview={(m) => alert(`Review: ${m.title}`)}
              onEdit={(m) => alert(`Edit: ${m.title}`)}
              onMove={(m) => alert(`Move: ${m.title}`)}
              onDelete={(m) => alert(`Delete: ${m.title}`)}
              onManageVersions={() => {
                setIsVersionStackOpen(true);
              }}
              onCompareVersions={() => {
                setIsWorkspaceOpen(true);
              }}
            />
          </div>

          <div className="flex flex-col justify-center gap-3 p-6 border border-dashed border-line rounded-xl bg-surface/50">
            <span className="text-xs font-bold uppercase tracking-wider text-muted font-mono">
              Interactive Dialogs
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsStackConfirmOpen(true)}
              className="justify-start gap-2"
            >
              <GitBranch size={14} />
              Open StackConfirmDialog
            </Button>
            <Button
              variant="lime"
              size="sm"
              onClick={() => setIsVersionStackOpen(true)}
              className="justify-start gap-2"
            >
              <Layers size={14} />
              Open VersionStackDialog
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsWorkspaceOpen(true)}
              className="justify-start gap-2"
            >
              <Columns2 size={14} />
              Launch Compare Workspace
            </Button>

            <div className="flex items-center justify-between pt-2 border-t border-line/60">
              <span className="text-[11px] font-bold text-muted font-mono">Workspace Switcher (+):</span>
              <VersionSwitcher
                currentMedia={MOCK_VERSION_STACK[2]}
                versions={MOCK_VERSION_STACK}
                onSelectVersion={(id) => alert(`Selected version: ${id}`)}
                onUploadVersion={() => setIsUploadVersionOpen(true)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Synchronized Comparison Viewport */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-ink flex items-center gap-2">
              <Columns2 size={18} className="text-lime" />
              <span>2. Synchronized Comparison Viewport</span>
            </h3>
            <p className="text-xs text-muted">
              Interactive preview of Side-by-Side (50/50), Curtain Wipe (drag handle), and Difference blend.
            </p>
          </div>

          {/* Mode Selector */}
          <div className="flex items-center gap-1.5 p-1 bg-surface border border-line rounded-lg">
            <button
              type="button"
              onClick={() => setCompareMode("side_by_side")}
              className={`px-3 py-1 text-xs font-bold rounded transition ${
                compareMode === "side_by_side" ? "bg-ink text-paper" : "text-muted hover:text-ink"
              }`}
            >
              Side by Side
            </button>
            <button
              type="button"
              onClick={() => setCompareMode("wipe")}
              className={`px-3 py-1 text-xs font-bold rounded transition ${
                compareMode === "wipe" ? "bg-ink text-paper" : "text-muted hover:text-ink"
              }`}
            >
              Curtain Wipe
            </button>
            <button
              type="button"
              onClick={() => setCompareMode("difference")}
              className={`px-3 py-1 text-xs font-bold rounded transition ${
                compareMode === "difference" ? "bg-ink text-paper" : "text-muted hover:text-ink"
              }`}
            >
              Difference
            </button>
          </div>
        </div>

        <Card className="p-4 bg-[#11130f] border-line overflow-hidden">
          <div className="h-[460px] w-full">
            <VersionCompareViewport
              mode={compareMode}
              mediaA={MOCK_VERSION_STACK[0]}
              mediaB={MOCK_VERSION_STACK[2]}
              srcA={SAMPLE_VIDEO_A}
              srcB={SAMPLE_VIDEO_B}
              videoARef={videoARef}
              videoBRef={videoBRef}
              wipePosition={wipePos}
              onWipePositionChange={setWipePos}
            />
          </div>
        </Card>
      </div>

      {/* Dialog Modals */}
      <StackConfirmDialog
        isOpen={isStackConfirmOpen}
        onClose={() => setIsStackConfirmOpen(false)}
        organizationId="org-demo"
        projectId="proj-demo"
        targetMedia={MOCK_VERSION_STACK[2]}
        sourceMedia={MOCK_VERSION_STACK[0]}
        onSuccess={() => setIsStackConfirmOpen(false)}
      />

      <VersionStackDialog
        isOpen={isVersionStackOpen}
        onClose={() => setIsVersionStackOpen(false)}
        organizationId="org-demo"
        projectId="proj-demo"
        media={MOCK_VERSION_STACK[2]}
        onCompare={() => {
          setIsVersionStackOpen(false);
          setIsWorkspaceOpen(true);
        }}
      />

      <UploadVersionDialog
        isOpen={isUploadVersionOpen}
        onClose={() => setIsUploadVersionOpen(false)}
        organizationId="org-demo"
        projectId="proj-demo"
        targetMedia={MOCK_VERSION_STACK[2]}
        onVersionCreated={(newMedia) => {
          alert(`Successfully uploaded new version: ${newMedia.title}`);
          setIsUploadVersionOpen(false);
        }}
      />

      {/* Fullscreen Workspace Modal */}
      {isWorkspaceOpen && (
        <div className="fixed inset-0 z-50 bg-[#11130f]">
          <VersionCompareWorkspace
            initialMediaA={MOCK_VERSION_STACK[0]}
            initialMediaB={MOCK_VERSION_STACK[2]}
            versions={MOCK_VERSION_STACK}
            onCloseCompare={() => setIsWorkspaceOpen(false)}
          />
        </div>
      )}
    </section>
  );
}
