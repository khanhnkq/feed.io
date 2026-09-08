"use client";

import type { MediaResponse } from "@feedio/api-client";
import { Columns3, RefreshCw } from "lucide-react";
import React, { useState } from "react";
import {
  MediaKanbanBoard,
  type ReviewStatus,
} from "@/modules/media";
import { Button } from "@/modules/ui";

const INITIAL_MOCK_MEDIA: MediaResponse[] = [
  {
    id: "media-1",
    organization_id: "org-demo",
    project_id: "proj-demo",
    title: "Cyberpunk City_Teaser_Final_Cut_v2.mp4",
    filename: "Cyberpunk City_Teaser_Final_Cut_v2.mp4",
    storage_key: "org-demo/proj-demo/media/1/source.mp4",
    file_size_bytes: 28450000,
    mime_type: "video/mp4",
    status: "ready",
    review_status: "approved",
    duration_seconds: 45.2,
    width: 3840,
    height: 2160,
    fps: 60,
    version_number: 2,
    thumbnail_url: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80",
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: "media-2",
    organization_id: "org-demo",
    project_id: "proj-demo",
    title: "Brand_Logo_Animation_Reveal_1080p.mov",
    filename: "Brand_Logo_Animation_Reveal_1080p.mov",
    storage_key: "org-demo/proj-demo/media/2/source.mov",
    file_size_bytes: 14200000,
    mime_type: "video/quicktime",
    status: "ready",
    review_status: "needs_changes",
    duration_seconds: 12.0,
    width: 1920,
    height: 1080,
    fps: 30,
    version_number: 1,
    thumbnail_url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80",
    created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: "media-3",
    organization_id: "org-demo",
    project_id: "proj-demo",
    title: "Soundtrack_Master_Orchestral_Audio.mp3",
    filename: "Soundtrack_Master_Orchestral_Audio.mp3",
    storage_key: "org-demo/proj-demo/media/3/source.mp3",
    file_size_bytes: 8400000,
    mime_type: "audio/mpeg",
    status: "ready",
    review_status: "in_progress",
    duration_seconds: 135.0,
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 1).toISOString(),
  },
  {
    id: "media-4",
    organization_id: "org-demo",
    project_id: "proj-demo",
    title: "Hero_Keyframe_Concept_Art.png",
    filename: "Hero_Keyframe_Concept_Art.png",
    storage_key: "org-demo/proj-demo/media/4/source.png",
    file_size_bytes: 4200000,
    mime_type: "image/png",
    status: "ready",
    review_status: "pending",
    width: 2560,
    height: 1440,
    thumbnail_url: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=600&auto=format&fit=crop&q=80",
    created_at: new Date(Date.now() - 3600000 * 6).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 6).toISOString(),
  },
  {
    id: "media-5",
    organization_id: "org-demo",
    project_id: "proj-demo",
    title: "Color_Grading_Showreel_V3.mp4",
    filename: "Color_Grading_Showreel_V3.mp4",
    storage_key: "org-demo/proj-demo/media/5/source.mp4",
    file_size_bytes: 52100000,
    mime_type: "video/mp4",
    status: "ready",
    review_status: "in_progress",
    duration_seconds: 64.8,
    width: 3840,
    height: 2160,
    fps: 60,
    version_number: 3,
    thumbnail_url: "https://images.unsplash.com/photo-1536240478700-b869070f9279?w=600&auto=format&fit=crop&q=80",
    created_at: new Date(Date.now() - 3600000 * 30).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 8).toISOString(),
  },
  {
    id: "media-6",
    organization_id: "org-demo",
    project_id: "proj-demo",
    title: "Social_Vertical_Reel_Cut_01.mp4",
    filename: "Social_Vertical_Reel_Cut_01.mp4",
    storage_key: "org-demo/proj-demo/media/6/source.mp4",
    file_size_bytes: 18900000,
    mime_type: "video/mp4",
    status: "ready",
    review_status: "approved",
    duration_seconds: 28.5,
    width: 1080,
    height: 1920,
    fps: 30,
    version_number: 1,
    thumbnail_url: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80",
    created_at: new Date(Date.now() - 3600000 * 72).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 10).toISOString(),
  },
];

export function StoryboardKanbanSection() {
  const [mediaList, setMediaList] = useState<MediaResponse[]>(INITIAL_MOCK_MEDIA);
  const [eventLogs, setEventLogs] = useState<string[]>([]);
  const [lastAction, setLastAction] = useState<string | null>(null);

  const handleStatusChange = (mediaId: string, newStatus: ReviewStatus) => {
    const targetItem = mediaList.find((m) => m.id === mediaId);
    if (!targetItem) return;

    const oldStatus = targetItem.review_status || "pending";
    if (oldStatus === newStatus) return;

    // Update list state
    setMediaList((prev) =>
      prev.map((m) => (m.id === mediaId ? { ...m, review_status: newStatus } : m)),
    );

    const logMsg = `Moved "${targetItem.title}" from [${oldStatus}] → [${newStatus}]`;
    setLastAction(logMsg);
    setEventLogs((prev) => [logMsg, ...prev.slice(0, 4)]);
  };

  const handleReset = () => {
    setMediaList(INITIAL_MOCK_MEDIA);
    setLastAction("Board reset to initial test data");
    setEventLogs((prev) => ["Board reset to initial test data", ...prev.slice(0, 4)]);
  };

  return (
    <section className="space-y-6" aria-label="Media Review Kanban Board Gallery">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-line pb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="grid size-6 place-items-center rounded-md bg-lime text-ink font-mono text-xs font-bold border border-ink/20">
              <Columns3 size={14} />
            </span>
            <span className="font-mono text-xs font-bold uppercase tracking-wider text-muted">
              Interactive Board View
            </span>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-ink">
            Media Review Kanban Board
          </h2>
          <p className="text-sm text-muted">
            Drag and drop videos across review stages (Pending Review, In Progress, Needs Changes, Approved).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RefreshCw size={14} />
            Reset Board
          </Button>
        </div>
      </div>

      {/* Live Event Notification Banner */}
      {lastAction && (
        <div className="flex items-center justify-between rounded-xl border border-ink/20 bg-lime/20 px-4 py-2.5 text-xs text-ink shadow-xs">
          <span className="font-mono font-medium">{lastAction}</span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
            Live Action
          </span>
        </div>
      )}

      {/* The Kanban Board Component */}
      <div className="rounded-2xl bg-surface p-4 sm:p-6">
        <MediaKanbanBoard
          mediaList={mediaList}
          onStatusChange={handleStatusChange}
          onOpenReview={(media) => {
            const msg = `Review Workspace opened for "${media.title}"`;
            setLastAction(msg);
            setEventLogs((prev) => [msg, ...prev.slice(0, 4)]);
          }}
          onEdit={(media) => {
            const msg = `Edit metadata opened for "${media.title}"`;
            setLastAction(msg);
          }}
          onDelete={(media) => {
            setMediaList((prev) => prev.filter((m) => m.id !== media.id));
            const msg = `Deleted "${media.title}"`;
            setLastAction(msg);
            setEventLogs((prev) => [msg, ...prev.slice(0, 4)]);
          }}
        />
      </div>

      {/* Audit Log / Event Feed */}
      {eventLogs.length > 0 && (
        <div className="rounded-xl border border-line bg-paper/60 p-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted font-mono mb-2">
            Recent Kanban Activity Log
          </h4>
          <ul className="space-y-1 font-mono text-xs text-ink">
            {eventLogs.map((log, idx) => (
              <li key={idx} className="flex items-center gap-2">
                <span className="text-muted">›</span>
                <span>{log}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
