/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Meta, StoryObj } from "@storybook/react";
import React, { useState } from "react";
import { client } from "@feedio/api-client";
import { Button } from "@/modules/ui";
import { ShareMediaDialog, ShareLinkItem } from "./share_media_dialog";

const mockLinks: ShareLinkItem[] = [
  {
    id: "link-101",
    organization_id: "org-demo",
    project_id: "proj-demo",
    media_id: "med-demo",
    allow_comments: true,
    allow_approval: true,
    allow_download: true,
    has_passphrase: false,
    expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    access_count: 18,
    is_revoked: false,
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
    share_url: "/share/tok_active1",
  },
  {
    id: "link-102",
    organization_id: "org-demo",
    project_id: "proj-demo",
    media_id: "med-demo",
    allow_comments: true,
    allow_approval: false,
    allow_download: false,
    has_passphrase: true,
    expires_at: new Date(Date.now() + 14 * 86400000).toISOString(),
    access_count: 5,
    is_revoked: false,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    share_url: "/share/tok_protected2",
  },
];

function setupApiMocks(linksToReturn = mockLinks) {
  let activeLinks = [...linksToReturn];

  client.get = (async () => {
    return { data: activeLinks, status: 200, statusText: "OK", headers: {}, config: {} } as any;
  }) as any;

  client.post = (async () => {
    const newId = `link-${Date.now()}`;
    const newLink: ShareLinkItem = {
      id: newId,
      organization_id: "org-demo",
      project_id: "proj-demo",
      media_id: "med-demo",
      allow_comments: true,
      allow_approval: true,
      allow_download: false,
      has_passphrase: false,
      expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
      access_count: 0,
      is_revoked: false,
      created_at: new Date().toISOString(),
      share_url: `/share/tok_${newId}`,
    };
    activeLinks = [newLink, ...activeLinks];
    return {
      data: { share_url: `/share/tok_${newId}` },
      status: 201,
      statusText: "Created",
      headers: {},
      config: {},
    } as any;
  }) as any;

  client.delete = (async (url: string) => {
    const id = url.split("/").pop();
    activeLinks = activeLinks.filter((l) => l.id !== id);
    return { data: { success: true }, status: 200, statusText: "OK", headers: {}, config: {} } as any;
  }) as any;
}

const meta: Meta<typeof ShareMediaDialog> = {
  title: "Share/ShareMediaDialog",
  component: ShareMediaDialog,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof ShareMediaDialog>;

export const DefaultOpen: Story = {
  render: () => {
    setupApiMocks(mockLinks);
    const DialogHost = () => {
      const [isOpen, setIsOpen] = useState(true);

      return (
        <div className="p-8 min-h-[500px]">
          <Button onClick={() => setIsOpen(true)}>Open Share Dialog</Button>
          <ShareMediaDialog
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            organizationId="org-demo"
            projectId="proj-demo"
            mediaId="med-demo"
            mediaTitle="Nike_Commercial_RoughCut_v03.mp4"
          />
        </div>
      );
    };

    return <DialogHost />;
  },
};

export const EmptyStateOpenOnCreate: Story = {
  render: () => {
    setupApiMocks([]);
    const DialogHost = () => {
      const [isOpen, setIsOpen] = useState(true);

      return (
        <div className="p-8 min-h-[500px]">
          <Button onClick={() => setIsOpen(true)}>Open Share Dialog (Empty)</Button>
          <ShareMediaDialog
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            organizationId="org-demo"
            projectId="proj-demo"
            mediaId="med-demo"
            mediaTitle="Commercial_Teaser_Final.mov"
          />
        </div>
      );
    };

    return <DialogHost />;
  },
};
