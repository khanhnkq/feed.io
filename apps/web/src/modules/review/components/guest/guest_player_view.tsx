"use client";

import type { CommentResponse, MediaResponse } from "@feedio/api-client";
import React, { useState } from "react";

import type { AnnotationShape } from "../../lib/annotation_serializer";
import { ImageReviewViewer } from "../image/image_review_viewer";
import { VideoPlayer } from "../player/video_player";

export interface GuestPlayerViewProps {
  media?: MediaResponse;
  isVideo?: boolean;
  streamUrl?: string | null;
  proxyUrl?: string | null;
  thumbnailUrl?: string | null;
  title?: string;
  fps?: number;
  duration?: number;
  allowComments?: boolean;
  comments?: CommentResponse[];
  activeComment?: CommentResponse | null;
  onSelectComment?: (comment: CommentResponse | null) => void;
  shapes?: AnnotationShape[];
  onShapesChange?: (shapes: AnnotationShape[]) => void;
  currentTime?: number;
  onTimeUpdate?: (time: number) => void;
}

export function GuestPlayerView({
  media,
  isVideo = true,
  streamUrl,
  proxyUrl,
  thumbnailUrl,
  title,
  fps = 24,
  duration = 0,
  comments = [],
  activeComment = null,
  onSelectComment = () => {},
  shapes: externalShapes,
  onShapesChange: externalOnShapesChange,
  currentTime = 0,
  onTimeUpdate,
}: GuestPlayerViewProps) {
  // Local state for annotations if not controlled externally
  const [internalShapes, setInternalShapes] = useState<AnnotationShape[]>([]);
  const shapes = externalShapes !== undefined ? externalShapes : internalShapes;
  const onShapesChange = externalOnShapesChange || setInternalShapes;

  // Adapt loose props into standard MediaResponse if full media object is not provided
  const resolvedMedia: MediaResponse = media || {
    id: "guest-media-preview",
    organization_id: "org-public",
    project_id: "proj-public",
    title: title || "Media Asset",
    filename: title || (isVideo ? "video.mp4" : "image.jpg"),
    file_size_bytes: 0,
    mime_type: isVideo ? "video/mp4" : "image/jpeg",
    storage_key: "public/shares",
    thumbnail_url: thumbnailUrl || undefined,
    stream_url: streamUrl || undefined,
    proxy_url: proxyUrl || streamUrl || undefined,
    duration_seconds: duration,
    fps: fps,
    review_status: "pending",
    status: "ready",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const isImageMedia =
    resolvedMedia.mime_type.startsWith("image/") ||
    !isVideo ||
    Boolean(
      resolvedMedia.filename?.endsWith(".png") ||
        resolvedMedia.filename?.endsWith(".jpg") ||
        resolvedMedia.filename?.endsWith(".jpeg") ||
        resolvedMedia.filename?.endsWith(".webp") ||
        resolvedMedia.filename?.endsWith(".svg"),
    );

  if (isImageMedia) {
    return (
      <div className="flex-1 w-full h-full relative overflow-hidden bg-[#0e0f0c]">
        <ImageReviewViewer
          media={resolvedMedia}
          comments={comments}
          activeComment={activeComment}
          onSelectComment={onSelectComment}
          shapes={shapes}
          onShapesChange={onShapesChange}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 w-full h-full relative overflow-hidden bg-[#0e0f0c]">
      <VideoPlayer
        media={resolvedMedia}
        comments={comments}
        activeComment={activeComment}
        onSelectComment={onSelectComment}
        shapes={shapes}
        onShapesChange={onShapesChange}
        currentTime={currentTime}
        onTimeUpdate={onTimeUpdate}
      />
    </div>
  );
}
