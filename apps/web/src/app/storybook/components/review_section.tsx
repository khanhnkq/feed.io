"use client";

import type { CommentResponse, MediaResponse } from "@feedio/api-client";
import {
  Clock,
  Film,
  ImageIcon,
  Palette,
  Play,
  Sliders,
} from "lucide-react";
import React, { useState } from "react";
import {
  CanvasAnnotationLayer,
  CommentComposer,
  CommentThread,
  ImageControls,
  PlaybackControls,
  TimelineScrubber,
  VersionSwitcher,
} from "@/modules/review";
import type { AnnotationShape, AnnotationTool } from "@/modules/review/lib/annotation_serializer";
import {
  Badge,
  Card,
  ColorPicker,
  RangeSlider,
  Tabs,
  TimecodeBadge,
} from "@/modules/ui";
import { PresenceAvatarGroup } from "@/modules/collaboration/components/presence_avatar_group";

const MOCK_PRESENCE_USERS = [
  { user_id: "u-1", name: "Elena Rostova", email: "elena@agency.com", joined_at: "" },
  { user_id: "u-2", name: "Marcus Vance", email: "marcus@client.com", joined_at: "" },
  { user_id: "u-3", name: "Sarah Connor", email: "sarah@feed.io", joined_at: "" },
];

const MOCK_REVIEW_MEDIA: MediaResponse = {
  id: "review-mock-media-001",
  organization_id: "org-demo",
  project_id: "proj-demo",
  title: "Brand_Commercial_Final_Cut_v02.mp4",
  filename: "Brand_Commercial_Final_Cut_v02.mp4",
  storage_key: "org/proj/media/brand_cut_v2.mp4",
  file_size_bytes: 45_000_000,
  mime_type: "video/mp4",
  status: "ready",
  duration_seconds: 64.5,
  width: 3840,
  height: 2160,
  fps: 24,
  version_group_id: "version-group-1",
  version_number: 2,
  created_at: new Date(Date.now() - 3600000).toISOString(),
  updated_at: new Date().toISOString(),
};

const MOCK_IMAGE_MEDIA: MediaResponse = {
  id: "review-mock-image-001",
  organization_id: "org-demo",
  project_id: "proj-demo",
  title: "Key_Visual_Poster_v01.png",
  filename: "Key_Visual_Poster_v01.png",
  storage_key: "org/proj/media/poster_v1.png",
  file_size_bytes: 8_500_000,
  mime_type: "image/png",
  status: "ready",
  width: 3840,
  height: 2160,
  version_group_id: "version-group-image",
  version_number: 1,
  stream_url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1600&auto=format&fit=crop&q=80",
  created_at: new Date(Date.now() - 3600000).toISOString(),
  updated_at: new Date().toISOString(),
};

const MOCK_VERSIONS: MediaResponse[] = [
  { ...MOCK_REVIEW_MEDIA, id: "review-mock-media-000", title: "Brand_Commercial_Rough_Cut_v01.mp4", version_number: 1, created_at: new Date(Date.now() - 86400000).toISOString() },
  MOCK_REVIEW_MEDIA,
  { ...MOCK_REVIEW_MEDIA, id: "review-mock-media-003", title: "Brand_Commercial_Color_Grade_v03.mp4", version_number: 3, created_at: new Date().toISOString() },
];

const INITIAL_MOCK_COMMENTS: CommentResponse[] = [
  {
    id: "c-1",
    organization_id: "org-demo",
    project_id: "proj-demo",
    media_id: "review-mock-media-001",
    user_id: "director_01",
    author: { id: "director_01", name: "Marcus Vance", email: "marcus@feed.io", avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80" },
    content: "Please adjust highlight roll-off and soften edge contrast here.",
    timestamp_seconds: 14.5,
    frame_number: 348,
    status: "open",
    annotation_data: {
      shapes: [{ id: "s1", type: "rect", x: 25, y: 20, width: 40, height: 35, color: "#D8FF43", strokeWidth: 3 }],
    },
    replies: [
      {
        id: "r-1",
        organization_id: "org-demo",
        project_id: "proj-demo",
        media_id: "review-mock-media-001",
        user_id: "colorist_02",
        author: { id: "colorist_02", name: "Elena Rostova", email: "elena@feed.io", avatar_url: "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&auto=format&fit=crop&q=80" },
        content: "Understood! Lowering contrast curves on the skin tones.",
        status: "open",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
    created_at: new Date(Date.now() - 7200000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "c-2",
    organization_id: "org-demo",
    project_id: "proj-demo",
    media_id: "review-mock-media-001",
    user_id: "producer_01",
    author: { id: "producer_01", name: "Alex Sterling", email: "alex@feed.io" },
    content: "Audio mix volume level is perfect on this transition.",
    timestamp_seconds: 42.0,
    frame_number: 1008,
    status: "resolved",
    replies: [],
    created_at: new Date(Date.now() - 14400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export function StoryboardReviewSection() {
  // Playback & review simulation state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(14.5);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [activeCommentId, setActiveCommentId] = useState<string | null>("c-1");
  const [comments, setComments] = useState<CommentResponse[]>(INITIAL_MOCK_COMMENTS);
  const [activeMedia, setActiveMedia] = useState<MediaResponse>(MOCK_REVIEW_MEDIA);

  // Drawing state
  const [shapes, setShapes] = useState<AnnotationShape[]>([]);
  const [activeTool, setActiveTool] = useState<AnnotationTool>("brush");
  const [activeColor, setActiveColor] = useState("#D8FF43");
  const [strokeWidth, setStrokeWidth] = useState(3);

  const [sliderVal, setSliderVal] = useState(65);
  const [selectedColor, setSelectedColor] = useState("#D8FF43");
  const [activeTab, setActiveTab] = useState("all");
  const [reviewMode, setReviewMode] = useState<"video" | "image">("video");
  const [imageZoom, setImageZoom] = useState(1);
  const [imageRotation, setImageRotation] = useState(0);

  const isImageMode = reviewMode === "image";
  const displayMedia = isImageMode ? MOCK_IMAGE_MEDIA : activeMedia;

  const tabItems = [
    { id: "all", label: `All (${comments.length})` },
    {
      id: "open",
      label: `Open (${comments.filter((c) => c.status === "open").length})`,
    },
  ];

  const handleResolveToggle = async (commentId: string, status: "open" | "resolved") => {
    setComments((prev) =>
      prev.map((c) => (c.id === commentId ? { ...c, status } : c)),
    );
  };

  const handleDeleteComment = async (commentId: string) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
    if (activeCommentId === commentId) setActiveCommentId(null);
  };

  const handleCreateReply = async (parentCommentId: string, content: string) => {
    const reply = {
      id: `r-${Date.now()}`,
      organization_id: displayMedia.organization_id,
      project_id: displayMedia.project_id,
      media_id: displayMedia.id,
      user_id: "demo_reply_user",
      author: { id: "demo_reply_user", name: "Sarah Connor" },
      content,
      status: "open",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setComments((prev) =>
      prev.map((c) =>
        c.id === parentCommentId
          ? { ...c, replies: [...(c.replies || []), reply] }
          : c,
      ),
    );
  };

  const handleCreateComment = async (data: {
    content: string;
    timestamp_seconds: number | null;
    frame_number: number | null;
    annotation_data: Record<string, unknown> | null;
  }) => {
    const newComment: CommentResponse = {
      id: `comment-${Date.now()}`,
      organization_id: displayMedia.organization_id,
      project_id: displayMedia.project_id,
      media_id: displayMedia.id,
      user_id: "demo_author",
      author: { id: "demo_author", name: "Marcus Vance" },
      content: data.content,
      timestamp_seconds: isImageMode ? undefined : data.timestamp_seconds ?? undefined,
      frame_number: isImageMode ? undefined : data.frame_number ?? undefined,
      annotation_data: data.annotation_data as unknown as Record<string, unknown>,
      status: "open",
      replies: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setComments((prev) => [newComment, ...prev]);
    setActiveCommentId(newComment.id);
  };

  return (
    <section className="space-y-10">
      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Film className="size-5 text-lime" />
            <h2 className="text-2xl font-bold tracking-tight text-ink">
              Review Experience & Frame-Accurate Controls
            </h2>
          </div>
          <p className="text-sm text-muted">
            SMPTE timecode sync, interactive waveform timeline scrubber, image pan/zoom, vector annotation layer, and threaded comments.
          </p>
        </div>

        {/* Workspace Mode Switcher */}
        <div className="flex items-center gap-1 rounded-xl border border-line bg-surface p-1">
          <button
            type="button"
            onClick={() => {
              setReviewMode("video");
              setShapes([]);
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              !isImageMode ? "bg-ink text-paper shadow-xs" : "text-muted hover:text-ink"
            }`}
          >
            <Film size={13} />
            <span>Video Review</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setReviewMode("image");
              setShapes([]);
            }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              isImageMode ? "bg-ink text-paper shadow-xs" : "text-muted hover:text-ink"
            }`}
          >
            <ImageIcon size={13} />
            <span>Image Review</span>
          </button>
        </div>
      </div>

      {/* 1. UI Primitives Showcase */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={15} className="text-ink" />
            <h3 className="font-mono text-xs font-bold uppercase text-ink">Timecode Badges</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <TimecodeBadge timecode="00:01:24:18" frameNumber={2034} fps={24} variant="lime" copyable />
            <TimecodeBadge timecode="00:00:14:12" size="sm" variant="default" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Palette size={15} className="text-ink" />
            <h3 className="font-mono text-xs font-bold uppercase text-ink">Color Picker</h3>
          </div>
          <ColorPicker selectedColor={selectedColor} onSelectColor={setSelectedColor} size="md" />
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sliders size={15} className="text-ink" />
            <h3 className="font-mono text-xs font-bold uppercase text-ink">Range Slider</h3>
          </div>
          <RangeSlider value={sliderVal} min={0} max={100} label="Audio Gain" formatValue={(v) => `${v}%`} onChange={setSliderVal} />
        </Card>
      </div>

      {/* 2. Interactive Review Simulation Workspace */}
      <div className="rounded-2xl border border-line bg-paper overflow-hidden shadow-sm">
        {/* Top Review Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-paper p-3.5">
          <div className="flex items-center gap-3">
            {!isImageMode && (
              <VersionSwitcher
                currentMedia={activeMedia}
                versions={MOCK_VERSIONS}
                onSelectVersion={(id) => {
                  const found = MOCK_VERSIONS.find((v) => v.id === id);
                  if (found) setActiveMedia(found);
                }}
              />
            )}
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-ink truncate max-w-xs">{displayMedia.title}</span>
              <Badge variant="lime" size="sm">
                {isImageMode ? "PNG 4K" : "4K UHD"}
              </Badge>
              {!isImageMode && <Badge variant="surface" size="sm">24 FPS</Badge>}
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <PresenceAvatarGroup users={MOCK_PRESENCE_USERS} />
            {!isImageMode ? (
              <TimecodeBadge timecode="00:00:14:12" frameNumber={348} fps={24} variant="lime" copyable />
            ) : (
              <Badge variant="surface" size="sm" className="font-mono">Image Workspace</Badge>
            )}
          </div>
        </div>

        {/* Viewport & Annotation Canvas Simulation */}
        <div className="grid grid-cols-1 lg:grid-cols-3 min-h-[460px]">
          {/* Left 2 Cols: Canvas & Controls */}
          <div className="relative z-10 lg:col-span-2 flex flex-col bg-paper">
            <div className="relative flex-1 min-h-[300px] bg-[#0D0E0C] flex items-center justify-center overflow-hidden">
              {/* Background Frame (Video Gradient or Image) */}
              {!isImageMode ? (
                <div className="absolute inset-0 bg-gradient-to-tr from-black via-zinc-900 to-stone-900 opacity-90 flex items-center justify-center">
                  <div className="text-center space-y-2 pointer-events-none">
                    <div className="grid size-14 mx-auto place-items-center rounded-2xl border border-white/20 bg-white/10 text-white backdrop-blur-sm">
                      <Play size={24} className="ml-1 text-white" />
                    </div>
                    <p className="font-mono text-xs text-muted">Interactive Video Simulation (Paused at 14.5s)</p>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    transform: `scale(${imageZoom}) rotate(${imageRotation}deg)`,
                    transition: "transform 0.1s ease-out",
                  }}
                  className="relative max-h-[85%] max-w-[85%] flex items-center justify-center"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={MOCK_IMAGE_MEDIA.stream_url || undefined}
                    alt="Mock poster"
                    className="max-h-[260px] object-contain rounded select-none pointer-events-none shadow-xl"
                  />
                </div>
              )}

              {/* Vector Annotation Layer Overlay */}
              <CanvasAnnotationLayer
                shapes={shapes}
                onShapesChange={setShapes}
                activeTool={activeTool}
                onToolChange={setActiveTool}
                activeColor={activeColor}
                onColorChange={setActiveColor}
                strokeWidth={strokeWidth}
                onStrokeWidthChange={setStrokeWidth}
                readonlyShapes={
                  activeCommentId === "c-1"
                    ? (INITIAL_MOCK_COMMENTS[0].annotation_data as { shapes?: AnnotationShape[] }).shapes
                    : null
                }
                isPaused={true}
              />
            </div>

            {/* Bottom Controls: Scrubber for Video or ImageControls for Image */}
            {!isImageMode ? (
              <div className="border-t border-line bg-paper px-4 py-2.5 text-ink">
                <TimelineScrubber
                  currentTime={currentTime}
                  duration={activeMedia.duration_seconds || 64.5}
                  fps={24}
                  onSeek={(s) => setCurrentTime(s)}
                  comments={comments}
                  activeCommentId={activeCommentId}
                  onSelectComment={(c) => {
                    setActiveCommentId(c ? c.id : null);
                    if (c?.timestamp_seconds) setCurrentTime(c.timestamp_seconds);
                  }}
                />
                <PlaybackControls
                  isPlaying={isPlaying}
                  onTogglePlay={() => setIsPlaying(!isPlaying)}
                  onStepFrame={(frames) => setCurrentTime((prev) => Math.max(0, prev + frames * (1 / 24)))}
                  onJumpSeconds={(secs) => setCurrentTime((prev) => Math.max(0, Math.min(64.5, prev + secs)))}
                  currentTime={currentTime}
                  duration={64.5}
                  fps={24}
                  playbackRate={playbackRate}
                  onChangePlaybackRate={setPlaybackRate}
                  isLooping={isLooping}
                  onToggleLoop={() => setIsLooping(!isLooping)}
                  volume={volume}
                  isMuted={isMuted}
                  onChangeVolume={setVolume}
                  onToggleMute={() => setIsMuted(!isMuted)}
                  isFullscreen={false}
                  onToggleFullscreen={() => {}}
                />
              </div>
            ) : (
              <ImageControls
                zoom={imageZoom}
                onZoomChange={setImageZoom}
                onResetZoom={() => setImageZoom(1)}
                rotation={imageRotation}
                onRotate={(delta) => setImageRotation((prev) => (prev + delta + 360) % 360)}
                onResetView={() => {
                  setImageZoom(1);
                  setImageRotation(0);
                }}
                width={3840}
                height={2160}
                fileSizeBytes={8500000}
                mimeType="image/png"
                isFullscreen={false}
                onToggleFullscreen={() => {}}
              />
            )}
          </div>

          {/* Right Col: Comment Sidebar Simulation */}
          <div className="border-l border-line bg-paper flex flex-col h-full">
            <div className="border-b border-line bg-paper p-3">
              <Tabs items={tabItems} activeId={activeTab} onChange={setActiveTab} size="sm" className="w-full justify-center" />
            </div>

            <div className="flex-1 p-3 space-y-2.5 overflow-y-auto max-h-[380px] bg-paper">
              {comments.map((c) => (
                <CommentThread
                  key={c.id}
                  comment={c}
                  fps={24}
                  isActive={c.id === activeCommentId}
                  onSelect={(selected) => {
                    setActiveCommentId(selected ? selected.id : null);
                    if (selected?.timestamp_seconds) setCurrentTime(selected.timestamp_seconds);
                  }}
                  onSeek={(s) => setCurrentTime(s)}
                  onResolveToggle={handleResolveToggle}
                  onDelete={handleDeleteComment}
                  onCreateReply={handleCreateReply}
                />
              ))}
            </div>

            <div className="border-t border-line p-3 bg-paper">
              <CommentComposer
                currentTime={currentTime}
                fps={24}
                shapes={shapes}
                onClearShapes={() => setShapes([])}
                onSubmit={handleCreateComment}
                isImage={isImageMode}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
