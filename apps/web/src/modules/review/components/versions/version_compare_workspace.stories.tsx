import type { Meta, StoryObj } from "@storybook/react";
import React, { useState } from "react";
import type { MediaResponse } from "@feedio/api-client";
import { Button } from "@/modules/ui";
import { VersionCompareWorkspace } from "./version_compare_workspace";

const mockVersions: MediaResponse[] = [
  {
    id: "med-wk-v1",
    organization_id: "org-demo",
    project_id: "proj-demo",
    title: "Cinematic_Teaser_v1.mp4",
    filename: "Cinematic_Teaser_v1.mp4",
    storage_key: "org-demo/proj-demo/med-wk-v1/source.mp4",
    file_size_bytes: 14000000,
    mime_type: "video/mp4",
    status: "ready",
    duration_seconds: 15.0,
    width: 1920,
    height: 1080,
    fps: 24.0,
    version_group_id: "vg-wk-1",
    version_number: 1,
    version_label: "Editorial Cut",
    is_primary_version: false,
    version_count: 3,
    thumbnail_storage_key: null,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: "med-wk-v2",
    organization_id: "org-demo",
    project_id: "proj-demo",
    title: "Cinematic_Teaser_v2.mp4",
    filename: "Cinematic_Teaser_v2.mp4",
    storage_key: "org-demo/proj-demo/med-wk-v2/source.mp4",
    file_size_bytes: 15000000,
    mime_type: "video/mp4",
    status: "ready",
    duration_seconds: 15.0,
    width: 1920,
    height: 1080,
    fps: 24.0,
    version_group_id: "vg-wk-1",
    version_number: 2,
    version_label: "Sound Design & Foley",
    is_primary_version: false,
    version_count: 3,
    thumbnail_storage_key: null,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: "med-wk-v3",
    organization_id: "org-demo",
    project_id: "proj-demo",
    title: "Cinematic_Teaser_v3.mp4",
    filename: "Cinematic_Teaser_v3.mp4",
    storage_key: "org-demo/proj-demo/med-wk-v3/source.mp4",
    file_size_bytes: 16000000,
    mime_type: "video/mp4",
    status: "ready",
    duration_seconds: 15.0,
    width: 1920,
    height: 1080,
    fps: 24.0,
    version_group_id: "vg-wk-1",
    version_number: 3,
    version_label: "Color Graded & Final Master",
    is_primary_version: true,
    version_count: 3,
    thumbnail_storage_key: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const meta: Meta<typeof VersionCompareWorkspace> = {
  title: "Review/VersionCompareWorkspace",
  component: VersionCompareWorkspace,
  parameters: {
    layout: "fullscreen",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof VersionCompareWorkspace>;

export const DefaultInteractive: Story = {
  render: () => {
    const WorkspaceHost = () => {
      const [isOpen, setIsOpen] = useState(true);

      if (!isOpen) {
        return (
          <div className="p-12">
            <Button onClick={() => setIsOpen(true)}>Launch Version Compare Workspace</Button>
          </div>
        );
      }

      return (
        <div className="h-screen w-screen bg-paper">
          <VersionCompareWorkspace
            initialMediaA={mockVersions[0]}
            initialMediaB={mockVersions[2]}
            versions={mockVersions}
            onCloseCompare={() => setIsOpen(false)}
          />
        </div>
      );
    };

    return <WorkspaceHost />;
  },
};
