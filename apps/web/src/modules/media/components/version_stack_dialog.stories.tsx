/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Meta, StoryObj } from "@storybook/react";
import React, { useState } from "react";
import type { MediaResponse } from "@feedio/api-client";
import { client } from "@feedio/api-client";
import { Button } from "@/modules/ui";
import { VersionStackDialog } from "./version_stack_dialog";

const mockVersions: MediaResponse[] = [
  {
    id: "med-v1",
    organization_id: "org-demo",
    project_id: "proj-demo",
    title: "Commercial_Hero_v1.mp4",
    filename: "Commercial_Hero_v1.mp4",
    storage_key: "org-demo/proj-demo/med-v1/source.mp4",
    file_size_bytes: 12000000,
    mime_type: "video/mp4",
    status: "ready",
    duration_seconds: 30.0,
    width: 1920,
    height: 1080,
    fps: 24.0,
    version_group_id: "vg-100",
    version_number: 1,
    version_label: "Assembly Cut",
    is_primary_version: false,
    version_count: 3,
    thumbnail_storage_key: null,
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: "med-v2",
    organization_id: "org-demo",
    project_id: "proj-demo",
    title: "Commercial_Hero_v2.mp4",
    filename: "Commercial_Hero_v2.mp4",
    storage_key: "org-demo/proj-demo/med-v2/source.mp4",
    file_size_bytes: 14500000,
    mime_type: "video/mp4",
    status: "ready",
    duration_seconds: 30.0,
    width: 1920,
    height: 1080,
    fps: 24.0,
    version_group_id: "vg-100",
    version_number: 2,
    version_label: "Sound & VFX Mix Pass",
    is_primary_version: false,
    version_count: 3,
    thumbnail_storage_key: null,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: "med-v3",
    organization_id: "org-demo",
    project_id: "proj-demo",
    title: "Commercial_Hero_v3.mp4",
    filename: "Commercial_Hero_v3.mp4",
    storage_key: "org-demo/proj-demo/med-v3/source.mp4",
    file_size_bytes: 15200000,
    mime_type: "video/mp4",
    status: "ready",
    duration_seconds: 30.0,
    width: 1920,
    height: 1080,
    fps: 24.0,
    version_group_id: "vg-100",
    version_number: 3,
    version_label: "Final Client Approved",
    is_primary_version: true,
    version_count: 3,
    thumbnail_storage_key: null,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
  },
];

function setupApiMocks() {
  client.get = (async () => {
    return {
      data: mockVersions,
      status: 200,
      statusText: "OK",
      headers: {},
      config: {},
    } as any;
  }) as any;

  client.post = (async () => {
    return {
      data: { success: true },
      status: 200,
      statusText: "OK",
      headers: {},
      config: {},
    } as any;
  }) as any;

  client.patch = (async () => {
    return {
      data: { success: true },
      status: 200,
      statusText: "OK",
      headers: {},
      config: {},
    } as any;
  }) as any;
}

const meta: Meta<typeof VersionStackDialog> = {
  title: "Media/VersionStackDialog",
  component: VersionStackDialog,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof VersionStackDialog>;

export const DefaultOpen: Story = {
  render: () => {
    setupApiMocks();
    const DialogHost = () => {
      const [isOpen, setIsOpen] = useState(true);

      return (
        <div className="p-8 min-h-[500px]">
          <Button onClick={() => setIsOpen(true)}>Open Version Stack Dialog</Button>
          <VersionStackDialog
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            organizationId="org-demo"
            projectId="proj-demo"
            media={mockVersions[2]}
            onCompare={(target, compare) => {
              alert(`Comparing ${target.title} with ${compare.title}`);
            }}
          />
        </div>
      );
    };

    return <DialogHost />;
  },
};
