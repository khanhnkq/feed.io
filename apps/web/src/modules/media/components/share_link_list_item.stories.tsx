import type { Meta, StoryObj } from "@storybook/react";
import React, { useState } from "react";
import { ShareLinkItem, ShareLinkListItem } from "./share_link_list_item";

const sampleLink: ShareLinkItem = {
  id: "link-001",
  organization_id: "org-1",
  project_id: "proj-1",
  media_id: "media-1",
  allow_comments: true,
  allow_approval: true,
  allow_download: true,
  has_passphrase: false,
  expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  access_count: 14,
  is_revoked: false,
  created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  share_url: "/share/tok_abc123",
};

const meta: Meta<typeof ShareLinkListItem> = {
  title: "Share/ShareLinkListItem",
  component: ShareLinkListItem,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="max-w-md p-4 bg-surface rounded-xl border border-line">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ShareLinkListItem>;

export const Active: Story = {
  args: {
    link: sampleLink,
    onRevoke: (id) => console.log("Revoke link", id),
    onCopy: (url, id) => console.log("Copied link", url, id),
  },
};

export const WithPassphrase: Story = {
  args: {
    link: {
      ...sampleLink,
      id: "link-002",
      has_passphrase: true,
      allow_approval: false,
      access_count: 3,
    },
    onRevoke: (id) => console.log("Revoke link", id),
  },
};

export const Expired: Story = {
  args: {
    link: {
      ...sampleLink,
      id: "link-003",
      expires_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      access_count: 42,
    },
    onRevoke: (id) => console.log("Revoke link", id),
  },
};

export const NoExpiration: Story = {
  args: {
    link: {
      ...sampleLink,
      id: "link-004",
      expires_at: null,
      access_count: 88,
      has_passphrase: true,
    },
    onRevoke: (id) => console.log("Revoke link", id),
  },
};

export const ViewOnly: Story = {
  args: {
    link: {
      ...sampleLink,
      id: "link-005",
      allow_comments: false,
      allow_approval: false,
      allow_download: false,
      access_count: 5,
    },
    onRevoke: (id) => console.log("Revoke link", id),
  },
};

export const InteractiveList: Story = {
  render: () => {
    const InteractiveComponent = () => {
      const [links, setLinks] = useState<ShareLinkItem[]>([
        sampleLink,
        {
          ...sampleLink,
          id: "link-002",
          has_passphrase: true,
          access_count: 7,
          expires_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          ...sampleLink,
          id: "link-003",
          expires_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
          access_count: 19,
        },
      ]);

      return (
        <div className="space-y-2">
          {links.length === 0 ? (
            <p className="text-xs text-muted text-center py-4">All links revoked</p>
          ) : (
            links.map((item) => (
              <ShareLinkListItem
                key={item.id}
                link={item}
                onRevoke={(id) => setLinks((prev) => prev.filter((l) => l.id !== id))}
              />
            ))
          )}
        </div>
      );
    };

    return <InteractiveComponent />;
  },
};
