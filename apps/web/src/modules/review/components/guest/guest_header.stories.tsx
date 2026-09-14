import type { Meta, StoryObj } from "@storybook/react";
import React from "react";
import { GuestHeader } from "./guest_header";
import { ShareDetails } from "./guest_types";

const mockShareDetails: ShareDetails = {
  media_id: "med-001",
  title: "Brand_Anthem_2026_ColorGrade_4K.mov",
  filename: "brand_anthem_cg.mov",
  duration_seconds: 124.5,
  fps: 24,
  width: 3840,
  height: 2160,
  mime_type: "video/quicktime",
  review_status: "pending",
  has_passphrase: false,
  is_authenticated: true,
  allow_comments: true,
  allow_approval: true,
  allow_download: true,
  thumbnail_url: null,
  waveform_data: null,
};

const meta: Meta<typeof GuestHeader> = {
  title: "GuestReview/GuestHeader",
  component: GuestHeader,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-full bg-paper">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof GuestHeader>;

export const PendingReview: Story = {
  args: {
    shareDetails: mockShareDetails,
    currentReviewStatus: "pending",
    guestName: "Alice Client",
    onDownloadAsset: () => alert("Download master asset triggered"),
    onGuestSubmitDecision: (status, notes, name) =>
      alert(`Decision recorded: ${status} by ${name} with notes: "${notes}"`),
  },
};

export const InProgress: Story = {
  args: {
    shareDetails: {
      ...mockShareDetails,
      review_status: "in_progress",
    },
    currentReviewStatus: "in_progress",
    guestName: "Alice Client",
    onDownloadAsset: () => alert("Download master asset triggered"),
    onGuestSubmitDecision: (status, notes, name) =>
      alert(`Decision recorded: ${status} by ${name} with notes: "${notes}"`),
  },
};

export const Approved: Story = {
  args: {
    shareDetails: {
      ...mockShareDetails,
      review_status: "approved",
    },
    currentReviewStatus: "approved",
    guestName: "Alice Client",
    onDownloadAsset: () => alert("Download master asset triggered"),
    onGuestSubmitDecision: (status, notes, name) =>
      alert(`Decision recorded: ${status} by ${name} with notes: "${notes}"`),
  },
};

export const NeedsChanges: Story = {
  args: {
    shareDetails: {
      ...mockShareDetails,
      review_status: "needs_changes",
    },
    currentReviewStatus: "needs_changes",
    guestName: "Alice Client",
    onDownloadAsset: () => alert("Download master asset triggered"),
    onGuestSubmitDecision: (status, notes, name) =>
      alert(`Decision recorded: ${status} by ${name} with notes: "${notes}"`),
  },
};

export const ApprovalDisabled: Story = {
  args: {
    shareDetails: {
      ...mockShareDetails,
      allow_approval: false,
    },
    currentReviewStatus: "in_progress",
    onDownloadAsset: () => alert("Download asset triggered"),
  },
};

export const DownloadDisabled: Story = {
  args: {
    shareDetails: {
      ...mockShareDetails,
      allow_download: false,
    },
    currentReviewStatus: "pending",
    guestName: "Alice Client",
    onDownloadAsset: () => {},
    onGuestSubmitDecision: (status, notes, name) =>
      alert(`Decision recorded: ${status} by ${name} with notes: "${notes}"`),
  },
};

