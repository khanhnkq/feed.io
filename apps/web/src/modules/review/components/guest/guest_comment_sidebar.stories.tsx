import type { Meta, StoryObj } from "@storybook/react";
import React, { useState } from "react";
import { GuestCommentSidebar } from "./guest_comment_sidebar";
import { PublicComment } from "./guest_types";

const mockComments: PublicComment[] = [
  {
    id: "c-1",
    content: "The logo animation feels a bit fast here. Can we slow down the fade-in by 10 frames?",
    timestamp_seconds: 4.5,
    frame_number: 108,
    annotation_data: {
      type: "pen",
      points: [100, 100, 120, 140, 150, 120],
      color: "#ff3b30",
      strokeWidth: 3,
    },
    created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
    author: {
      name: "Marcus Vance",
      email: "marcus@agency.com",
    },
    replies: [
      {
        id: "c-1-r1",
        content: "Agreed, making the change in v05 cut right now!",
        timestamp_seconds: null,
        frame_number: null,
        annotation_data: null,
        created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
        author: {
          name: "Editor Lead",
        },
      },
    ],
  },
  {
    id: "c-2",
    content: "Color grading in the shadows looks clean and well-balanced.",
    timestamp_seconds: 18.25,
    frame_number: 438,
    annotation_data: null,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    author: {
      name: "Guest Reviewer",
    },
  },
];

const meta: Meta<typeof GuestCommentSidebar> = {
  title: "GuestReview/GuestCommentSidebar",
  component: GuestCommentSidebar,
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="h-[640px] flex border border-line rounded-xl overflow-hidden bg-paper">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof GuestCommentSidebar>;

export const Empty: Story = {
  args: {
    comments: [],
    guestName: "Alex",
    onGuestNameChange: () => {},
    currentTime: 0,
    fps: 24,
    onSeek: (s) => alert(`Seek to: ${s}`),
    onCreateComment: async (data) => {
      alert(`Created comment: "${data.content}" by "${data.guest_name}"`);
    },
  },
};

export const WithComments: Story = {
  args: {
    ...Empty.args,
    comments: mockComments,
  },
};

export const ActiveCommentSelected: Story = {
  args: {
    ...Empty.args,
    comments: mockComments,
    activeCommentId: "c-1",
    currentTime: 4.5,
  },
};

export const InteractiveSidebar: Story = {
  render: () => {
    const InteractiveHost = () => {
      const [comments, setComments] = useState<PublicComment[]>(mockComments);
      const [selectedId, setSelectedId] = useState<string | null>(null);
      const [guestName, setGuestName] = useState("Guest Director");
      const [currentTime, setCurrentTime] = useState(4.5);

      const handleCreateComment = async (data: {
        content: string;
        timestamp_seconds: number | null;
        frame_number: number | null;
        annotation_data: Record<string, unknown> | null;
        guest_name?: string;
      }) => {
        const newComment: PublicComment = {
          id: `comment-${Date.now()}`,
          content: data.content,
          timestamp_seconds: data.timestamp_seconds,
          frame_number: data.frame_number,
          annotation_data: data.annotation_data as unknown as PublicComment["annotation_data"],
          created_at: new Date().toISOString(),
          author: { name: data.guest_name || guestName || "Guest" },
        };
        setComments((prev) => [newComment, ...prev]);
      };

      const handleCreateReply = async (parentId: string, content: string, replyGuestName?: string) => {
        setComments((prev) =>
          prev.map((c) => {
            if (c.id === parentId) {
              const replies = c.replies || [];
              return {
                ...c,
                replies: [
                  ...replies,
                  {
                    id: `reply-${Date.now()}`,
                    content,
                    timestamp_seconds: null,
                    frame_number: null,
                    annotation_data: null,
                    created_at: new Date().toISOString(),
                    author: { name: replyGuestName || guestName || "Guest" },
                  },
                ],
              };
            }
            return c;
          }),
        );
      };

      return (
        <GuestCommentSidebar
          comments={comments}
          activeCommentId={selectedId}
          onSelectComment={(c) => {
            setSelectedId(c ? c.id : null);
            if (c?.timestamp_seconds != null) {
              setCurrentTime(c.timestamp_seconds);
            }
          }}
          guestName={guestName}
          onGuestNameChange={setGuestName}
          currentTime={currentTime}
          fps={24}
          onSeek={setCurrentTime}
          onCreateComment={handleCreateComment}
          onCreateReply={handleCreateReply}
        />
      );
    };

    return <InteractiveHost />;
  },
};
