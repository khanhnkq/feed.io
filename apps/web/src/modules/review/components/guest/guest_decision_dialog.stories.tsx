import type { Meta, StoryObj } from "@storybook/react";
import React, { useState } from "react";
import { Button } from "@/modules/ui";
import { GuestDecisionDialog } from "./guest_decision_dialog";

const meta: Meta<typeof GuestDecisionDialog> = {
  title: "GuestReview/GuestDecisionDialog",
  component: GuestDecisionDialog,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof GuestDecisionDialog>;

export const ApproveDialog: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    title: "Commercial_Hero_Teaser_Final_Cut.mov",
    decisionStatus: "approved",
    guestName: "Sarah Connor (Client Rep)",
    onGuestNameChange: () => {},
    decisionNote: "Looks fantastic! Audio mix and color grade are approved for broadcast.",
    onDecisionNoteChange: () => {},
    isSubmitting: false,
    onSubmit: () => alert("Approve submitted"),
  },
};

export const RequestChangesDialog: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    title: "Commercial_Hero_Teaser_Final_Cut.mov",
    decisionStatus: "needs_changes",
    guestName: "David Miller",
    onGuestNameChange: () => {},
    decisionNote: "Please adjust the end card timing at 00:01:23:10 and lower the background music slightly.",
    onDecisionNoteChange: () => {},
    isSubmitting: false,
    onSubmit: () => alert("Needs changes submitted"),
  },
};

export const InProgressDialog: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    title: "Commercial_Hero_Teaser_Final_Cut.mov",
    decisionStatus: "in_progress",
    guestName: "Elena Rostova",
    onGuestNameChange: () => {},
    decisionNote: "Currently reviewing the v3 sound mix with the creative director. Will have final signoff shortly.",
    onDecisionNoteChange: () => {},
    isSubmitting: false,
    onSubmit: () => alert("In progress submitted"),
  },
};

export const PendingReviewDialog: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    title: "Commercial_Hero_Teaser_Final_Cut.mov",
    decisionStatus: "pending",
    guestName: "Elena Rostova",
    onGuestNameChange: () => {},
    decisionNote: "Resetting review status back to pending for another review cycle.",
    onDecisionNoteChange: () => {},
    isSubmitting: false,
    onSubmit: () => alert("Pending submitted"),
  },
};

export const SubmittingState: Story = {
  args: {
    ...ApproveDialog.args,
    isSubmitting: true,
  },
};

export const InteractiveDialog: Story = {
  render: () => {
    const InteractiveHost = () => {
      const [isOpen, setIsOpen] = useState(false);
      const [status, setStatus] = useState<"approved" | "needs_changes" | "in_progress" | "pending">("approved");
      const [guestName, setGuestName] = useState("Alex Johnson");
      const [decisionNote, setDecisionNote] = useState("");
      const [isSubmitting, setIsSubmitting] = useState(false);

      const handleSubmit = () => {
        setIsSubmitting(true);
        setTimeout(() => {
          setIsSubmitting(false);
          setIsOpen(false);
          alert(`Decision "${status}" submitted by ${guestName} with note: "${decisionNote}"`);
        }, 800);
      };

      return (
        <div className="p-8 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="primary"
              onClick={() => {
                setStatus("approved");
                setIsOpen(true);
              }}
            >
              Open Approve Dialog
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setStatus("needs_changes");
                setIsOpen(true);
              }}
            >
              Open Request Changes Dialog
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setStatus("in_progress");
                setIsOpen(true);
              }}
            >
              Open In Progress Dialog
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setStatus("pending");
                setIsOpen(true);
              }}
            >
              Open Pending Review Dialog
            </Button>
          </div>

          <GuestDecisionDialog
            isOpen={isOpen}
            onClose={() => setIsOpen(false)}
            title="Commercial_Hero_Teaser_Final_Cut.mov"
            decisionStatus={status}
            guestName={guestName}
            onGuestNameChange={setGuestName}
            decisionNote={decisionNote}
            onDecisionNoteChange={setDecisionNote}
            isSubmitting={isSubmitting}
            onSubmit={handleSubmit}
          />
        </div>
      );
    };

    return <InteractiveHost />;
  },
};
