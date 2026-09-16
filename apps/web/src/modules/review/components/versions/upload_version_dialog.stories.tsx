/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Meta, StoryObj } from "@storybook/react";
import React, { useState } from "react";
import type { MediaResponse } from "@feedio/api-client";
import { client } from "@feedio/api-client";
import { Button } from "@/modules/ui";
import { UploadVersionDialog } from "./upload_version_dialog";

const mockTargetMedia: MediaResponse = {
  id: "story-target-media-01",
  organization_id: "org-demo",
  project_id: "proj-demo",
  title: "Commercial_Hero_v1.mp4",
  filename: "Commercial_Hero_v1.mp4",
  storage_key: "org-demo/proj-demo/v1.mp4",
  file_size_bytes: 25000000,
  mime_type: "video/mp4",
  status: "ready",
  duration_seconds: 30.0,
  width: 1920,
  height: 1080,
  fps: 24.0,
  version_group_id: "vg-demo-1",
  version_number: 1,
  version_label: "Assembly Cut",
  is_primary_version: true,
  version_count: 1,
  thumbnail_storage_key: null,
  created_at: new Date(Date.now() - 86400000).toISOString(),
  updated_at: new Date(Date.now() - 86400000).toISOString(),
};

function setupApiMocks() {
  client.post = (async () => {
    return {
      data: {
        upload_url: "https://storage.feedio.dev/upload",
        media_id: "new-version-media-id",
        ...mockTargetMedia,
        version_number: 2,
        version_count: 2,
      },
      status: 200,
      statusText: "OK",
      headers: {},
      config: {},
    } as any;
  }) as any;
}

const meta: Meta<typeof UploadVersionDialog> = {
  title: "Review/UploadVersionDialog",
  component: UploadVersionDialog,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof UploadVersionDialog>;

export const DefaultOpen: Story = {
  render: () => {
    setupApiMocks();
    const DialogHost = () => {
      const [isOpen, setIsOpen] = useState(true);

      return (
        <div className="p-8 min-h-[500px]">
          <Button onClick={() => setIsOpen(true)}>Open Upload Version Dialog</Button>
          <UploadVersionDialog
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            organizationId="org-demo"
            projectId="proj-demo"
            targetMedia={mockTargetMedia}
            onVersionCreated={(newMedia) => {
              alert(`Version created successfully: ${newMedia.title} (V${newMedia.version_number})`);
              setIsOpen(false);
            }}
          />
        </div>
      );
    };

    return <DialogHost />;
  },
};
