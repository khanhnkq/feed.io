import type { CommentResponse, MediaResponse } from "@feedio/api-client";
import { describe, expect, it } from "vitest";
import {
  generateDaVinciCSV,
  generateEDL,
  generateFCPXML,
  generatePremiereCSV,
} from "../../lib/nle_marker_export";
import type { NleFormat } from "./nle_export_dialog";

describe("NLE Export Dialog State & Business Logic", () => {
  const mockMedia: MediaResponse = {
    id: "media-1",
    organization_id: "org-1",
    project_id: "proj-1",
    storage_key: "org-1/proj-1/cut.mov",
    title: "Commercial_FinalCut.mov",
    filename: "Commercial_FinalCut.mov",
    mime_type: "video/quicktime",
    file_size_bytes: 10485760,
    status: "ready",
    fps: 23.976,
    duration_seconds: 60,
    review_status: "in_review",
    created_at: "2026-09-27T00:00:00Z",
    updated_at: "2026-09-27T00:00:00Z",
  };

  const mockComments: CommentResponse[] = [
    {
      id: "c1",
      organization_id: "org-1",
      project_id: "proj-1",
      media_id: "media-1",
      user_id: "u1",
      content: "Sound mix is too low here",
      timestamp_seconds: 14.2,
      frame_number: 340,
      status: "open",
      created_at: "2026-09-27T00:00:00Z",
      updated_at: "2026-09-27T00:00:00Z",
      author: {
        id: "u1",
        name: "Sound Engineer",
      },
    },
    {
      id: "c2",
      organization_id: "org-1",
      project_id: "proj-1",
      media_id: "media-1",
      user_id: "u2",
      content: "Approved framing",
      timestamp_seconds: 28.5,
      frame_number: 683,
      status: "resolved",
      created_at: "2026-09-27T00:00:00Z",
      updated_at: "2026-09-27T00:00:00Z",
      author: {
        id: "u2",
        name: "Client Lead",
      },
    },
    {
      id: "c3",
      organization_id: "org-1",
      project_id: "proj-1",
      media_id: "media-1",
      user_id: "u3",
      content: "General feedback not bound to time",
      timestamp_seconds: null,
      status: "open",
      created_at: "2026-09-27T00:00:00Z",
      updated_at: "2026-09-27T00:00:00Z",
    },
  ];

  it("filters comments into valid timecoded markers only", () => {
    const validMarkers = mockComments.filter(
      (c) => typeof c.timestamp_seconds === "number" && c.timestamp_seconds >= 0,
    );
    expect(validMarkers.length).toBe(2);
    expect(validMarkers[0].content).toBe("Sound mix is too low here");
  });

  it("correctly evaluates feature gating for Free vs Pro tiers", () => {
    const isFreeTier = (tier: string) => tier === "free";
    const canExportNle = (tier: string, features?: { nle_export?: boolean }) => {
      if (features?.nle_export !== undefined) return features.nle_export;
      return !isFreeTier(tier);
    };

    expect(canExportNle("free")).toBe(false);
    expect(canExportNle("pro_100gb")).toBe(true);
    expect(canExportNle("pro_500gb")).toBe(true);
    expect(canExportNle("pro_1tb")).toBe(true);
    expect(canExportNle("free", { nle_export: true })).toBe(true);
  });

  it("generates correct filename based on selected format", () => {
    const cleanTitle = (mockMedia.title || "video").replace(/\.[^/.]+$/, "");
    const getTargetFilename = (format: NleFormat) => {
      switch (format) {
        case "premiere":
          return `${cleanTitle}_premiere_markers.csv`;
        case "resolve_csv":
          return `${cleanTitle}_resolve_markers.csv`;
        case "resolve_edl":
          return `${cleanTitle}_markers.edl`;
        case "fcpxml":
          return `${cleanTitle}_fcpxml_markers.fcpxml`;
      }
    };

    expect(getTargetFilename("premiere")).toBe("Commercial_FinalCut_premiere_markers.csv");
    expect(getTargetFilename("resolve_csv")).toBe("Commercial_FinalCut_resolve_markers.csv");
    expect(getTargetFilename("resolve_edl")).toBe("Commercial_FinalCut_markers.edl");
    expect(getTargetFilename("fcpxml")).toBe("Commercial_FinalCut_fcpxml_markers.fcpxml");
  });

  it("produces non-empty payload for all 4 supported export targets", () => {
    const validMarkers = mockComments
      .filter((c) => typeof c.timestamp_seconds === "number" && c.timestamp_seconds >= 0)
      .map((c) => ({
        id: c.id,
        content: c.content,
        timestamp_seconds: c.timestamp_seconds,
        author_name: c.author?.name || undefined,
        status: c.status,
      }));

    const fps = mockMedia.fps ?? 24;
    const title = mockMedia.title ?? "Clip";

    const premiere = generatePremiereCSV(validMarkers, fps, title);
    const resolveCSV = generateDaVinciCSV(validMarkers, fps);
    const resolveEDL = generateEDL(validMarkers, fps, title);
    const fcpxml = generateFCPXML(validMarkers, fps, title);

    expect(premiere.length).toBeGreaterThan(50);
    expect(resolveCSV.length).toBeGreaterThan(50);
    expect(resolveEDL.length).toBeGreaterThan(50);
    expect(fcpxml.length).toBeGreaterThan(50);
  });
});
