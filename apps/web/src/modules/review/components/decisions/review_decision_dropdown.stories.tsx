import type { Meta, StoryObj } from "@storybook/react";
import React, { useState } from "react";
import { ReviewDecisionDropdown, type ReviewStatus } from "./review_decision_dropdown";

const meta: Meta<typeof ReviewDecisionDropdown> = {
  title: "Review/ReviewDecisionDropdown",
  component: ReviewDecisionDropdown,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="p-8 bg-paper flex items-center justify-start min-h-[300px]">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ReviewDecisionDropdown>;

export const PendingReview: Story = {
  args: {
    currentStatus: "pending",
    isGuest: true,
    guestName: "Alice Client",
    onGuestSubmitDecision: (status, notes, name) => {
      alert(`Decision "${status}" submitted by "${name}" with note: "${notes}"`);
    },
  },
};

export const InProgress: Story = {
  args: {
    currentStatus: "in_progress",
    isGuest: true,
    guestName: "Alice Client",
    onGuestSubmitDecision: (status, notes, name) => {
      alert(`Decision "${status}" submitted by "${name}" with note: "${notes}"`);
    },
  },
};

export const Approved: Story = {
  args: {
    currentStatus: "approved",
    isGuest: true,
    guestName: "Alice Client",
    onGuestSubmitDecision: (status, notes, name) => {
      alert(`Decision "${status}" submitted by "${name}" with note: "${notes}"`);
    },
  },
};

export const NeedsChanges: Story = {
  args: {
    currentStatus: "needs_changes",
    isGuest: true,
    guestName: "Alice Client",
    onGuestSubmitDecision: (status, notes, name) => {
      alert(`Decision "${status}" submitted by "${name}" with note: "${notes}"`);
    },
  },
};

export const Disabled: Story = {
  args: {
    currentStatus: "pending",
    disabled: true,
  },
};

export const InteractiveState: Story = {
  render: () => {
    const InteractiveHost = () => {
      const [status, setStatus] = useState<ReviewStatus>("pending");
      const [guestName, setGuestName] = useState("Alice Client");

      return (
        <div className="space-y-4">
          <div className="text-xs font-mono text-muted">
            Current Status State: <span className="font-bold text-ink">{status}</span>
          </div>
          <ReviewDecisionDropdown
            isGuest
            currentStatus={status}
            guestName={guestName}
            onGuestNameChange={setGuestName}
            onGuestSubmitDecision={(newStatus, notes, name) => {
              setStatus(newStatus);
              alert(`Updated decision to ${newStatus} by ${name}: "${notes}"`);
            }}
            onDecisionUpdated={(newStatus) => setStatus(newStatus)}
          />
        </div>
      );
    };

    return <InteractiveHost />;
  },
};
