"use client";

import type { MediaResponse } from "@feedio/api-client";
import { Film } from "lucide-react";
import React, { useState } from "react";
import {
  DeleteMediaDialog,
  EditMediaDialog,
  MediaCard,
  MediaTableView,
  MediaViewerModal,
  MoveMediaDialog,
  UploadMediaDialog,
  UploadMediaFileCard,
} from "@/modules/media";
import { Button } from "@/modules/ui";

const MOCK_READY_MEDIA: MediaResponse = {
  id: "f794fcfb-f2d3-4d73-ac11-0f1f64cdac25",
  organization_id: "org-demo-123",
  project_id: "proj-demo-456",
  title: "pinoria-demo-cinematic-hq.mp4",
  filename: "pinoria-demo-cinematic-hq.mp4",
  storage_key: "organizations/org-demo-123/projects/proj-demo-456/media/f794fcfb/source.mp4",
  file_size_bytes: 14857600,
  mime_type: "video/mp4",
  status: "ready",
  duration_seconds: 14.5,
  width: 1920,
  height: 1080,
  fps: 60.0,
  thumbnail_storage_key: "organizations/org-demo-123/projects/proj-demo-456/media/f794fcfb/thumbnail.jpg",
  hls_storage_key: "organizations/org-demo-123/projects/proj-demo-456/media/f794fcfb/hls/master.m3u8",
  created_at: new Date(Date.now() - 3600000).toISOString(),
  updated_at: new Date(Date.now() - 1800000).toISOString(),
};

const MOCK_IMAGE_MEDIA: MediaResponse = {
  id: "e1234567-89ab-4cde-0123-456789abcdef",
  organization_id: "org-demo-123",
  project_id: "proj-demo-456",
  title: "storyboard_keyframe_scene04.png",
  filename: "storyboard_keyframe_scene04.png",
  storage_key: "organizations/org-demo-123/projects/proj-demo-456/media/e123/scene04.png",
  file_size_bytes: 3450000,
  mime_type: "image/png",
  status: "ready",
  duration_seconds: undefined,
  width: 2400,
  height: 1600,
  fps: undefined,
  thumbnail_storage_key: null,
  hls_storage_key: null,
  created_at: new Date(Date.now() - 7200000).toISOString(),
  updated_at: new Date(Date.now() - 7200000).toISOString(),
};

const MOCK_SVG_MEDIA: MediaResponse = {
  id: "b9876543-21fe-4dcba-9876-543210fedcba",
  organization_id: "org-demo-123",
  project_id: "proj-demo-456",
  title: "brand_mark_vector.svg",
  filename: "brand_mark_vector.svg",
  storage_key: "organizations/org-demo-123/projects/proj-demo-456/media/b987/logo.svg",
  file_size_bytes: 48200,
  mime_type: "image/svg+xml",
  status: "ready",
  duration_seconds: undefined,
  width: 800,
  height: 600,
  fps: undefined,
  thumbnail_storage_key: null,
  hls_storage_key: null,
  created_at: new Date(Date.now() - 14400000).toISOString(),
  updated_at: new Date(Date.now() - 14400000).toISOString(),
};

const MOCK_PROCESSING_MEDIA: MediaResponse = {
  id: "a0b7589e-0ba2-4c3e-88bd-a92042572f91",
  organization_id: "org-demo-123",
  project_id: "proj-demo-456",
  title: "commercial_hero_cut_4k.mov",
  filename: "commercial_hero_cut_4k.mov",
  storage_key: "organizations/org-demo-123/projects/proj-demo-456/media/a0b7589e/source.mov",
  file_size_bytes: 125829120,
  mime_type: "video/quicktime",
  status: "processing",
  duration_seconds: undefined,
  width: undefined,
  height: undefined,
  fps: undefined,
  thumbnail_storage_key: null,
  hls_storage_key: null,
  created_at: new Date(Date.now() - 60000).toISOString(),
  updated_at: new Date(Date.now() - 60000).toISOString(),
};

const MOCK_FAILED_MEDIA: MediaResponse = {
  id: "d775e698-be12-408e-962f-b08574ccb444",
  organization_id: "org-demo-123",
  project_id: "proj-demo-456",
  title: "corrupted_archive_raw.mkv",
  filename: "corrupted_archive_raw.mkv",
  storage_key: "organizations/org-demo-123/projects/proj-demo-456/media/d775e698/source.mkv",
  file_size_bytes: 45000000,
  mime_type: "video/x-matroska",
  status: "failed",
  duration_seconds: undefined,
  width: undefined,
  height: undefined,
  fps: undefined,
  thumbnail_storage_key: null,
  hls_storage_key: null,
  created_at: new Date(Date.now() - 86400000).toISOString(),
  updated_at: new Date(Date.now() - 86400000).toISOString(),
};

export function StoryboardMediaSection() {
  const [selectedMedia, setSelectedMedia] = useState<MediaResponse | null>(null);
  const [editMedia, setEditMedia] = useState<MediaResponse | null>(null);
  const [deleteMedia, setDeleteMedia] = useState<MediaResponse | null>(null);
  const [moveMedia, setMoveMedia] = useState<MediaResponse | null>(null);
  const [showUploadDialog, setShowUploadDialog] = useState<boolean>(false);

  // Mock File objects for upload progress cards
  const mockFileImage = new File(["dummy content"], "storyboard_keyframe_scene04.png", {
    type: "image/png",
  });
  const mockFileMultipart = new File(["dummy content"], "feature_film_prores_master.mov", {
    type: "video/quicktime",
  });

  return (
    <section className="space-y-10">
      <div className="border-b border-line pb-3">
        <div className="flex items-center gap-2">
          <Film size={18} className="text-focus" />
          <h2 className="text-xl font-bold tracking-tight text-ink">
            Media & Asset Components
          </h2>
        </div>
        <p className="text-xs text-muted mt-1 font-mono">
          Modules: `@/modules/media/components/*` (MediaCard, MediaTableView, UploadMediaFileCard, MediaViewerModal)
        </p>
      </div>

      {/* Section 1: Media Cards Grid */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted font-mono">
            1. Media & Image Asset Cards (Grid View)
          </h3>
          <p className="text-xs text-muted mt-0.5">
            Displays video cuts, image keyframes, vector SVGs, transcoding states, and action menus.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          <div>
            <span className="font-mono text-[10px] font-bold text-muted uppercase block mb-2">
              Video Ready (HLS + 60fps)
            </span>
            <MediaCard
              media={MOCK_READY_MEDIA}
              onPlay={setSelectedMedia}
              onEdit={setEditMedia}
              onMove={setMoveMedia}
              onDelete={setDeleteMedia}
            />
          </div>

          <div>
            <span className="font-mono text-[10px] font-bold text-muted uppercase block mb-2">
              Image Asset (PNG / 2400x1600)
            </span>
            <MediaCard
              media={MOCK_IMAGE_MEDIA}
              onPlay={setSelectedMedia}
              onEdit={setEditMedia}
              onMove={setMoveMedia}
              onDelete={setDeleteMedia}
            />
          </div>

          <div>
            <span className="font-mono text-[10px] font-bold text-muted uppercase block mb-2">
              Vector Asset (SVG Graphic)
            </span>
            <MediaCard
              media={MOCK_SVG_MEDIA}
              onPlay={setSelectedMedia}
              onEdit={setEditMedia}
              onMove={setMoveMedia}
              onDelete={setDeleteMedia}
            />
          </div>

          <div>
            <span className="font-mono text-[10px] font-bold text-muted uppercase block mb-2">
              Processing State (Transcoding)
            </span>
            <MediaCard
              media={MOCK_PROCESSING_MEDIA}
              onPlay={setSelectedMedia}
              onEdit={setEditMedia}
              onMove={setMoveMedia}
              onDelete={setDeleteMedia}
            />
          </div>

          <div>
            <span className="font-mono text-[10px] font-bold text-muted uppercase block mb-2">
              Failed State (Error Alert)
            </span>
            <MediaCard
              media={MOCK_FAILED_MEDIA}
              onPlay={setSelectedMedia}
              onEdit={setEditMedia}
              onMove={setMoveMedia}
              onDelete={setDeleteMedia}
            />
          </div>
        </div>
      </div>

      {/* Section 2: Media Table View */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted font-mono">
            2. Media & Asset Table View (List Layout)
          </h3>
          <p className="text-xs text-muted mt-0.5">
            Architectural table with columns for Name, Duration, Format, Resolution, File Size, and Actions.
          </p>
        </div>

        <MediaTableView
          mediaList={[
            MOCK_READY_MEDIA,
            MOCK_IMAGE_MEDIA,
            MOCK_SVG_MEDIA,
            MOCK_PROCESSING_MEDIA,
            MOCK_FAILED_MEDIA,
          ]}
          onPlay={setSelectedMedia}
          onEdit={setEditMedia}
          onMove={setMoveMedia}
          onDelete={setDeleteMedia}
        />
      </div>

      {/* Section 3: Upload Media Progress Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted font-mono">
              3. Upload Progress Cards & Multipart S3
            </h3>
            <p className="text-xs text-muted mt-0.5">
              Previews single PUT uploads, image asset uploads, and chunked multipart S3 uploads with speed/ETA telemetry.
            </p>
          </div>
          <Button
            size="sm"
            variant="lime"
            onClick={() => setShowUploadDialog(true)}
          >
            Launch Upload Dialog
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <UploadMediaFileCard
            file={mockFileImage}
            meta={{
              durationSeconds: 0,
              width: 2400,
              height: 1600,
              thumbnailBlob: null,
              thumbnailDataUrl: null,
            }}
            isExtracting={false}
            status="uploading"
            progress={82}
            loadedBytes={2829000}
            isWorking={true}
            speedBytesPerSec={2500000}
            etaSeconds={1}
            onReset={() => {}}
          />

          <UploadMediaFileCard
            file={mockFileMultipart}
            meta={{
              durationSeconds: 120.0,
              width: 3840,
              height: 2160,
              thumbnailBlob: null,
              thumbnailDataUrl: null,
            }}
            isExtracting={false}
            status="uploading"
            progress={65}
            loadedBytes={81788928}
            isWorking={true}
            isMultipart={true}
            completedParts={7}
            totalParts={10}
            speedBytesPerSec={18500000}
            etaSeconds={3}
            onReset={() => {}}
          />
        </div>
      </div>

      {/* Modal Dialogs */}
      {showUploadDialog && (
        <UploadMediaDialog
          open={showUploadDialog}
          onOpenChange={setShowUploadDialog}
          organizationId="org-demo-123"
          projectId="proj-demo-456"
        />
      )}

      {selectedMedia && (
        <MediaViewerModal
          open={Boolean(selectedMedia)}
          onOpenChange={(open) => !open && setSelectedMedia(null)}
          organizationId="org-demo-123"
          projectId="proj-demo-456"
          mediaId={selectedMedia.id}
        />
      )}

      {editMedia && (
        <EditMediaDialog
          open={Boolean(editMedia)}
          onOpenChange={(open) => !open && setEditMedia(null)}
          organizationId="org-demo-123"
          projectId="proj-demo-456"
          media={editMedia}
        />
      )}

      {moveMedia && (
        <MoveMediaDialog
          open={Boolean(moveMedia)}
          onOpenChange={(open) => !open && setMoveMedia(null)}
          organizationId="org-demo-123"
          projectId="proj-demo-456"
          media={moveMedia}
        />
      )}

      {deleteMedia && (
        <DeleteMediaDialog
          isOpen={Boolean(deleteMedia)}
          onClose={() => setDeleteMedia(null)}
          organizationId="org-demo-123"
          projectId="proj-demo-456"
          media={deleteMedia}
        />
      )}
    </section>
  );
}
