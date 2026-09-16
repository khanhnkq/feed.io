import type { Meta, StoryObj } from "@storybook/react";
import React, { useRef, useState } from "react";
import type { MediaResponse } from "@feedio/api-client";
import { VersionCompareViewport } from "./version_compare_viewport";

const mockMediaA: MediaResponse = {
  id: "med-comp-a",
  organization_id: "org-demo",
  project_id: "proj-demo",
  title: "Commercial_Cut_V1.mp4",
  filename: "Commercial_Cut_V1.mp4",
  storage_key: "org-demo/proj-demo/med-comp-a/source.mp4",
  file_size_bytes: 18000000,
  mime_type: "video/mp4",
  status: "ready",
  duration_seconds: 30.0,
  width: 1920,
  height: 1080,
  fps: 24.0,
  version_number: 1,
  version_label: "Original Cut",
  is_primary_version: false,
  version_count: 2,
  thumbnail_storage_key: null,
  created_at: new Date(Date.now() - 86400000).toISOString(),
  updated_at: new Date(Date.now() - 86400000).toISOString(),
};

const mockMediaB: MediaResponse = {
  id: "med-comp-b",
  organization_id: "org-demo",
  project_id: "proj-demo",
  title: "Commercial_Cut_V2_Graded.mp4",
  filename: "Commercial_Cut_V2_Graded.mp4",
  storage_key: "org-demo/proj-demo/med-comp-b/source.mp4",
  file_size_bytes: 18500000,
  mime_type: "video/mp4",
  status: "ready",
  duration_seconds: 30.0,
  width: 1920,
  height: 1080,
  fps: 24.0,
  version_number: 2,
  version_label: "Color Graded & Contrast Boost",
  is_primary_version: true,
  version_count: 2,
  thumbnail_storage_key: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const SAMPLE_VIDEO_A =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";
const SAMPLE_VIDEO_B =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4";

const meta: Meta<typeof VersionCompareViewport> = {
  title: "Review/VersionCompareViewport",
  component: VersionCompareViewport,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof VersionCompareViewport>;

export const SideBySideMode: Story = {
  render: () => {
    const ViewportHost = () => {
      const videoARef = useRef<HTMLVideoElement | null>(null);
      const videoBRef = useRef<HTMLVideoElement | null>(null);
      const [wipePosition, setWipePosition] = useState(50);

      return (
        <div className="p-6 bg-[#11130f] rounded-xl border border-line min-h-[500px]">
          <div className="h-[450px]">
            <VersionCompareViewport
              mode="side_by_side"
              mediaA={mockMediaA}
              mediaB={mockMediaB}
              srcA={SAMPLE_VIDEO_A}
              srcB={SAMPLE_VIDEO_B}
              videoARef={videoARef}
              videoBRef={videoBRef}
              wipePosition={wipePosition}
              onWipePositionChange={setWipePosition}
            />
          </div>
        </div>
      );
    };

    return <ViewportHost />;
  },
};

export const WipeMode: Story = {
  render: () => {
    const ViewportHost = () => {
      const videoARef = useRef<HTMLVideoElement | null>(null);
      const videoBRef = useRef<HTMLVideoElement | null>(null);
      const [wipePosition, setWipePosition] = useState(50);

      return (
        <div className="p-6 bg-[#11130f] rounded-xl border border-line min-h-[500px]">
          <div className="mb-4 flex items-center justify-between text-xs text-paper/70 font-mono">
            <span>DRAG THE CURTAIN HANDLE ACROSS THE SCREEN:</span>
            <span>Split: {Math.round(wipePosition)}%</span>
          </div>
          <div className="h-[450px]">
            <VersionCompareViewport
              mode="wipe"
              mediaA={mockMediaA}
              mediaB={mockMediaB}
              srcA={SAMPLE_VIDEO_A}
              srcB={SAMPLE_VIDEO_B}
              videoARef={videoARef}
              videoBRef={videoBRef}
              wipePosition={wipePosition}
              onWipePositionChange={setWipePosition}
            />
          </div>
        </div>
      );
    };

    return <ViewportHost />;
  },
};

export const DifferenceBlendMode: Story = {
  render: () => {
    const ViewportHost = () => {
      const videoARef = useRef<HTMLVideoElement | null>(null);
      const videoBRef = useRef<HTMLVideoElement | null>(null);
      const [wipePosition, setWipePosition] = useState(50);

      return (
        <div className="p-6 bg-[#11130f] rounded-xl border border-line min-h-[500px]">
          <div className="h-[450px]">
            <VersionCompareViewport
              mode="difference"
              mediaA={mockMediaA}
              mediaB={mockMediaB}
              srcA={SAMPLE_VIDEO_A}
              srcB={SAMPLE_VIDEO_B}
              videoARef={videoARef}
              videoBRef={videoBRef}
              wipePosition={wipePosition}
              onWipePositionChange={setWipePosition}
            />
          </div>
        </div>
      );
    };

    return <ViewportHost />;
  },
};
