/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Meta, StoryObj } from "@storybook/react";
import React, { useState } from "react";
import type { MediaResponse } from "@feedio/api-client";
import { client } from "@feedio/api-client";
import { Button } from "@/modules/ui";
import { StackConfirmDialog } from "./stack_confirm_dialog";

const mockTargetMedia: MediaResponse = {
  id: "med-target-001",
  organization_id: "org-demo",
  project_id: "proj-demo",
  title: "Commercial_Hero_Master.mp4",
  filename: "Commercial_Hero_Master.mp4",
  storage_key: "org-demo/proj-demo/med-target-001/source.mp4",
  file_size_bytes: 15000000,
  mime_type: "video/mp4",
  status: "ready",
  duration_seconds: 30.0,
  width: 1920,
  height: 1080,
  fps: 24.0,
  version_group_id: "vg-100",
  version_number: 1,
  version_label: "Rough Assembly Cut",
  is_primary_version: true,
  version_count: 1,
  thumbnail_storage_key: null,
  created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
};

const mockSourceMedia: MediaResponse = {
  id: "med-source-002",
  organization_id: "org-demo",
  project_id: "proj-demo",
  title: "Commercial_Hero_V2_ColorGraded.mp4",
  filename: "Commercial_Hero_V2_ColorGraded.mp4",
  storage_key: "org-demo/proj-demo/med-source-002/source.mp4",
  file_size_bytes: 15000000,
  mime_type: "video/mp4",
  status: "ready",
  duration_seconds: 30.0,
  width: 1920,
  height: 1080,
  fps: 24.0,
  version_group_id: null,
  version_number: 1,
  version_label: null,
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
        ...mockTargetMedia,
        version_count: 2,
      },
      status: 200,
      statusText: "OK",
      headers: {},
      config: {},
    } as any;
  }) as any;
}

const meta: Meta<typeof StackConfirmDialog> = {
  title: "Media/StackConfirmDialog",
  component: StackConfirmDialog,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof StackConfirmDialog>;

export const DefaultOpen: Story = {
  render: () => {
    setupApiMocks();
    const DialogHost = () => {
      const [isOpen, setIsOpen] = useState(true);

      return (
        <div className="p-8 min-h-[500px]">
          <Button onClick={() => setIsOpen(true)}>Open Stack Confirmation Dialog</Button>
          <StackConfirmDialog
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            organizationId="org-demo"
            projectId="proj-demo"
            targetMedia={mockTargetMedia}
            sourceMedia={mockSourceMedia}
            onSuccess={() => {
              setIsOpen(false);
            }}
          />
        </div>
      );
    };

    return <DialogHost />;
  },
};
