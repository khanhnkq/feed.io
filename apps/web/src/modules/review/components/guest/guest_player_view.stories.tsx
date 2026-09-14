import type { CommentResponse, MediaResponse } from "@feedio/api-client";
import type { Meta, StoryObj } from "@storybook/react";
import React, { useState } from "react";
import type { AnnotationShape } from "../../lib/annotation_serializer";
import { GuestPlayerView } from "./guest_player_view";

const mockVideoMedia: MediaResponse = {
  id: "med-video-001",
  organization_id: "org-001",
  project_id: "proj-001",
  title: "Commercial_Hero_Teaser_Final_Cut.mp4",
  filename: "hero_teaser_final.mp4",
  file_size_bytes: 45000000,
  mime_type: "video/mp4",
  storage_key: "videos/hero_teaser.mp4",
  stream_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  proxy_url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
  thumbnail_url: "https://images.unsplash.com/photo-1536240478700-b869070f9279?w=800&auto=format&fit=crop&q=80",
  duration_seconds: 596.4,
  fps: 24,
  review_status: "in_progress",
  status: "ready",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockImageMedia: MediaResponse = {
  id: "med-image-002",
  organization_id: "org-001",
  project_id: "proj-001",
  title: "KeyArt_Poster_Campaign_Final_4K.jpg",
  filename: "keyart_poster_4k.jpg",
  file_size_bytes: 8500000,
  mime_type: "image/jpeg",
  storage_key: "images/keyart.jpg",
  stream_url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1600&auto=format&fit=crop&q=80",
  proxy_url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1600&auto=format&fit=crop&q=80",
  thumbnail_url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&auto=format&fit=crop&q=80",
  width: 3840,
  height: 2160,
  review_status: "pending",
  status: "ready",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockComments: CommentResponse[] = [
  {
    id: "com-001",
    media_id: "med-video-001",
    organization_id: "org-001",
    project_id: "proj-001",
    user_id: "usr-001",
    author: {
      id: "usr-001",
      name: "Sarah Connor (Client Rep)",
      email: "sarah@client.com",
    },
    content: "Please punch up the saturation on the title card here at 00:00:15:00.",
    timestamp_seconds: 15.0,
    frame_number: 360,
    annotation_data: {
      shapes: [
        {
          id: "shp-rect-1",
          type: "rect",
          color: "#D8FF43",
          strokeWidth: 3,
          x: 25,
          y: 20,
          width: 50,
          height: 35,
        },
      ],
    },
    status: "active",
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "com-002",
    media_id: "med-video-001",
    organization_id: "org-001",
    project_id: "proj-001",
    user_id: "usr-002",
    author: {
      id: "usr-002",
      name: "Alex Director",
      email: "alex@feed.io",
    },
    content: "Audio mix dip works well here. Good pacing.",
    timestamp_seconds: 42.5,
    frame_number: 1020,
    status: "resolved",
    created_at: new Date(Date.now() - 1800000).toISOString(),
    updated_at: new Date(Date.now() - 1800000).toISOString(),
  },
];

const meta: Meta<typeof GuestPlayerView> = {
  title: "GuestReview/GuestPlayerView",
  component: GuestPlayerView,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <div className="h-[700px] w-full bg-[#0a0b08] p-4 flex flex-col">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof GuestPlayerView>;

export const VideoPlayerView: Story = {
  render: () => {
    const VideoHost = () => {
      const [shapes, setShapes] = useState<AnnotationShape[]>([]);
      const [activeComment, setActiveComment] = useState<CommentResponse | null>(null);
      const [currentTime, setCurrentTime] = useState(15.0);

      return (
        <GuestPlayerView
          media={mockVideoMedia}
          isVideo={true}
          comments={mockComments}
          activeComment={activeComment}
          onSelectComment={setActiveComment}
          shapes={shapes}
          onShapesChange={setShapes}
          currentTime={currentTime}
          onTimeUpdate={setCurrentTime}
        />
      );
    };

    return <VideoHost />;
  },
};

export const ImageReviewerView: Story = {
  render: () => {
    const ImageHost = () => {
      const [shapes, setShapes] = useState<AnnotationShape[]>([
        {
          id: "shp-rect-img",
          type: "rect",
          color: "#D8FF43",
          strokeWidth: 3,
          x: 20,
          y: 15,
          width: 40,
          height: 30,
        },
      ]);
      const [activeComment, setActiveComment] = useState<CommentResponse | null>(null);

      return (
        <GuestPlayerView
          media={mockImageMedia}
          isVideo={false}
          comments={[]}
          activeComment={activeComment}
          onSelectComment={setActiveComment}
          shapes={shapes}
          onShapesChange={setShapes}
        />
      );
    };

    return <ImageHost />;
  },
};
