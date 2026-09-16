import type { ProjectIssueResponse } from "@feedio/api-client";
import { describe, expect, it } from "vitest";

const MOCK_ISSUES: ProjectIssueResponse[] = [
  {
    id: "issue-1",
    organization_id: "org-1",
    project_id: "proj-1",
    media_id: "media-1",
    media_title: "Hero_Promo_Cut.mp4",
    media_type: "video",
    media_version_number: 2,
    user_id: "user-1",
    content: "Fix audio clipping at 00:15",
    timestamp_seconds: 15.5,
    frame_number: 372,
    status: "open",
    replies_count: 2,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    author: {
      id: "user-1",
      name: "Director John",
      email: "john@feed.io",
    },
    annotation_data: { type: "arrow" },
  },
  {
    id: "issue-2",
    organization_id: "org-1",
    project_id: "proj-1",
    media_id: "media-1",
    media_title: "Hero_Promo_Cut.mp4",
    media_type: "video",
    media_version_number: 2,
    user_id: "user-2",
    content: "Color grading is too warm in this shot",
    timestamp_seconds: 42.0,
    frame_number: 1008,
    status: "resolved",
    replies_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    author: {
      id: "user-2",
      name: "Colorist Sarah",
    },
  },
  {
    id: "issue-3",
    organization_id: "org-1",
    project_id: "proj-1",
    media_id: "media-2",
    media_title: "Poster_Still.png",
    media_type: "image",
    media_version_number: 1,
    user_id: "user-1",
    content: "Align title text with safe margins",
    timestamp_seconds: null,
    frame_number: null,
    status: "open",
    replies_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    author: {
      id: "user-1",
      name: "Director John",
    },
  },
];

describe("Project Issues Data & Metrics Logic", () => {
  it("calculates metrics correctly for total, open, resolved, and percentage", () => {
    const total = MOCK_ISSUES.length;
    const openCount = MOCK_ISSUES.filter((i) => i.status === "open").length;
    const resolvedCount = MOCK_ISSUES.filter((i) => i.status === "resolved").length;

    expect(total).toBe(3);
    expect(openCount).toBe(2);
    expect(resolvedCount).toBe(1);

    const resolutionPct = Math.round((resolvedCount / total) * 100);
    expect(resolutionPct).toBe(33);
  });

  it("filters issues by status accurately", () => {
    const openIssues = MOCK_ISSUES.filter((i) => i.status === "open");
    expect(openIssues.map((i) => i.id)).toEqual(["issue-1", "issue-3"]);

    const resolvedIssues = MOCK_ISSUES.filter((i) => i.status === "resolved");
    expect(resolvedIssues.map((i) => i.id)).toEqual(["issue-2"]);
  });

  it("filters issues by media asset accurately", () => {
    const media1Issues = MOCK_ISSUES.filter((i) => i.media_id === "media-1");
    expect(media1Issues.length).toBe(2);

    const media2Issues = MOCK_ISSUES.filter((i) => i.media_id === "media-2");
    expect(media2Issues.length).toBe(1);
    expect(media2Issues[0].content).toContain("Align title text");
  });

  it("correctly identifies video vs image media issues and annotations", () => {
    const videoIssue = MOCK_ISSUES.find((i) => i.id === "issue-1")!;
    expect(videoIssue.media_type).toBe("video");
    expect(videoIssue.timestamp_seconds).toBe(15.5);
    expect(videoIssue.annotation_data).toBeDefined();

    const imageIssue = MOCK_ISSUES.find((i) => i.id === "issue-3")!;
    expect(imageIssue.media_type).toBe("image");
    expect(imageIssue.timestamp_seconds).toBeNull();
  });
});
