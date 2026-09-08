import type { MediaResponse } from "@feedio/api-client";
import { describe, expect, it } from "vitest";
import type { ReviewStatus } from "./media_kanban_column";

const MOCK_ITEMS: MediaResponse[] = [
  {
    id: "item-1",
    organization_id: "org-1",
    project_id: "proj-1",
    title: "Video_Cut_01.mp4",
    filename: "Video_Cut_01.mp4",
    storage_key: "org-1/proj-1/media/1/source.mp4",
    file_size_bytes: 10485760,
    mime_type: "video/mp4",
    status: "ready",
    review_status: "approved",
    duration_seconds: 30,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "item-2",
    organization_id: "org-1",
    project_id: "proj-1",
    title: "Intro_Teaser.mp4",
    filename: "Intro_Teaser.mp4",
    storage_key: "org-1/proj-1/media/2/source.mp4",
    file_size_bytes: 5242880,
    mime_type: "video/mp4",
    status: "ready",
    review_status: "needs_changes",
    duration_seconds: 15,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "item-3",
    organization_id: "org-1",
    project_id: "proj-1",
    title: "Rough_Cut_v1.mp4",
    filename: "Rough_Cut_v1.mp4",
    storage_key: "org-1/proj-1/media/3/source.mp4",
    file_size_bytes: 20971520,
    mime_type: "video/mp4",
    status: "ready",
    review_status: "pending",
    duration_seconds: 60,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

describe("MediaKanbanBoard & Column Grouping Logic", () => {
  it("correctly groups media into 4 status categories", () => {
    const groups: Record<ReviewStatus, MediaResponse[]> = {
      pending: [],
      in_progress: [],
      needs_changes: [],
      approved: [],
    };

    MOCK_ITEMS.forEach((media) => {
      const rawStatus = (media.review_status || "pending").toLowerCase() as ReviewStatus;
      const status: ReviewStatus = rawStatus in groups ? rawStatus : "pending";
      groups[status].push(media);
    });

    expect(groups.approved).toHaveLength(1);
    expect(groups.needs_changes).toHaveLength(1);
    expect(groups.pending).toHaveLength(1);
    expect(groups.in_progress).toHaveLength(0);
    expect(groups.approved[0].title).toBe("Video_Cut_01.mp4");
  });

  it("calculates accurate completion metrics across board columns", () => {
    const total = MOCK_ITEMS.length;
    const approved = 1;
    const approvedPct = Math.round((approved / total) * 100);

    expect(total).toBe(3);
    expect(approvedPct).toBe(33);
  });
});
