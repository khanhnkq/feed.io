import { describe, expect, it } from "vitest";
import {
  generateDaVinciCSV,
  generateEDL,
  generateFCPXML,
  generatePremiereCSV,
  type MarkerExportItem,
} from "./nle_marker_export";

describe("NLE Marker Export Utilities", () => {
  const sampleComments: MarkerExportItem[] = [
    {
      id: "c1",
      content: "Color correction needed on face",
      timestamp_seconds: 12.5,
      author_name: "Sarah Director",
      status: "open",
    },
    {
      id: "c2",
      content: "Cut 2 frames here",
      timestamp_seconds: 45.0,
      author_name: "Dave Editor",
      status: "resolved",
    },
    {
      id: "c3",
      content: "General comment without timecode",
      timestamp_seconds: null,
      author_name: "Dave Editor",
    },
  ];

  it("generates Adobe Premiere Pro CSV with timecodes", () => {
    const csv = generatePremiereCSV(sampleComments, 24, "Sample Cut");
    expect(csv).toContain("Marker Name,Description,In,Out,Duration,Marker Type");
    expect(csv).toContain('"Note by Sarah Director"');
    expect(csv).toContain('"Color correction needed on face"');
    expect(csv).toContain("00:00:12:12"); // 12.5s @ 24fps = 300 frames -> 00:00:12:12
    expect(csv).not.toContain("General comment without timecode");
  });

  it("generates DaVinci Resolve marker CSV", () => {
    const csv = generateDaVinciCSV(sampleComments, 24);
    expect(csv).toContain("Timecode,Name,Notes,Color");
    expect(csv).toContain("00:00:12:12");
    expect(csv).toContain('"Feedi Feedback (Sarah Director)"');
    expect(csv).toContain('"Color correction needed on face",Blue');
    expect(csv).toContain('"Cut 2 frames here",Green'); // resolved status becomes Green
  });

  it("generates CMX 3600 EDL locators", () => {
    const edl = generateEDL(sampleComments, 24, "Commercial_v2");
    expect(edl).toContain("TITLE: COMMERCIAL_V2");
    expect(edl).toContain("FCM: NON-DROP FRAME");
    expect(edl).toContain("001  AX       V     C        00:00:12:12");
    expect(edl).toContain("* LOC: 00:00:12:12 BLUE Color correction needed on face [Sarah Director]");
  });

  it("generates Final Cut Pro FCPXML markers", () => {
    const xml = generateFCPXML(sampleComments, 24, "Commercial_v2");
    expect(xml).toContain("<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
    expect(xml).toContain("<fcpxml version=\"1.9\">");
    expect(xml).toContain("<marker");
    expect(xml).toContain('value="Color correction needed on face - Sarah Director"');
  });
});
