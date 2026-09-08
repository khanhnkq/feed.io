"use client";

import {
  type CommentResponse,
  getListMediaCommentsQueryKey,
  type MediaResponse,
  useCreateComment,
  useDeleteComment,
  useGetCurrentUser,
  useGetMediaVersions,
  useListMediaComments,
  useListOrganizationMembers,
  useUpdateComment,
} from "@feedio/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Copy, Download, Film, ImageIcon, Share2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useMemo, useState } from "react";
import { Badge } from "../../ui/components/badge";
import { Button } from "../../ui/components/button";
import {
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogDescription,
  DialogEyebrow,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../ui/components/dialog";
import { type AnnotationShape, deserializeAnnotations } from "../lib/annotation_serializer";
import { CommentSidebar } from "./comments/comment_sidebar";
import { ImageReviewViewer } from "./image/image_review_viewer";
import { VideoPlayer } from "./player/video_player";
import { VersionSwitcher } from "./versions/version_switcher";
import { ReviewDecisionDropdown } from "./decisions/review_decision_dropdown";
import { useRealtimeMedia } from "../../collaboration/hooks/use_realtime_media";
import { PresenceAvatarGroup } from "../../collaboration/components/presence_avatar_group";
import { NotificationBell } from "../../notifications/components/notification_bell";

interface ReviewWorkspaceProps {
  organizationSlug: string;
  organizationId: string;
  projectId: string;
  projectName?: string;
  initialMedia: MediaResponse;
}

export function ReviewWorkspace({
  organizationSlug,
  organizationId,
  projectId,
  projectName = "Project",
  initialMedia,
}: ReviewWorkspaceProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const currentMedia = initialMedia;
  const [activeComment, setActiveComment] = useState<CommentResponse | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [drawingShapes, setDrawingShapes] = useState<AnnotationShape[]>([]);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);

  // 1. Fetch Comments
  const { data: comments = [], refetch: refetchComments } = useListMediaComments(
    organizationId,
    projectId,
    currentMedia.id,
    {
      query: {
        enabled: Boolean(organizationId && projectId && currentMedia.id),
      },
    },
  );

  // 2. Fetch Versions
  const { data: versions = [] } = useGetMediaVersions(
    organizationId,
    projectId,
    currentMedia.id,
    {
      query: {
        enabled: Boolean(organizationId && projectId && currentMedia.id),
      },
    },
  );

  // 3. Current User & Real-time Collaboration Hook
  const { data: currentUser } = useGetCurrentUser();

  const { presenceUsers } = useRealtimeMedia({
    mediaId: currentMedia.id,
    userId: currentUser?.id,
    userName: currentUser?.display_name,
    userEmail: currentUser?.email,
    enabled: Boolean(currentMedia?.id),
    onCommentCreated: () => {
      queryClient.invalidateQueries({
        queryKey: getListMediaCommentsQueryKey(organizationId, projectId, currentMedia.id),
      });
      refetchComments();
    },
    onCommentUpdated: () => {
      queryClient.invalidateQueries({
        queryKey: getListMediaCommentsQueryKey(organizationId, projectId, currentMedia.id),
      });
      refetchComments();
    },
    onCommentDeleted: (payload) => {
      if (activeComment?.id === payload.comment_id) {
        setActiveComment(null);
        setDrawingShapes([]);
      }
      queryClient.invalidateQueries({
        queryKey: getListMediaCommentsQueryKey(organizationId, projectId, currentMedia.id),
      });
      refetchComments();
    },
  });

  // 4. Organization Members for Mentions
  const { data: orgMembersData } = useListOrganizationMembers(organizationId, undefined, {
    query: { enabled: Boolean(organizationId) },
  });

  const mentionMembers = useMemo(() => {
    const map = new Map<string, { id: string; name: string; email?: string; avatar_url?: string }>();
    if (orgMembersData?.items) {
      orgMembersData.items.forEach((m) => {
        map.set(m.user_id, {
          id: m.user_id,
          name: m.display_name || m.email.split("@")[0],
          email: m.email,
        });
      });
    }
    presenceUsers.forEach((p) => {
      if (!map.has(p.user_id)) {
        map.set(p.user_id, {
          id: p.user_id,
          name: p.name,
          email: p.email || undefined,
          avatar_url: p.avatar_url || undefined,
        });
      }
    });
    return Array.from(map.values());
  }, [orgMembersData, presenceUsers]);

  // 5. Comment Mutations
  const createCommentMutation = useCreateComment();
  const updateCommentMutation = useUpdateComment();
  const deleteCommentMutation = useDeleteComment();

  const handleSelectComment = (c: CommentResponse | null) => {
    if (!c || activeComment?.id === c.id) {
      setActiveComment(null);
      setDrawingShapes([]);
      return;
    }
    setActiveComment(c);
    if (c.timestamp_seconds !== null && c.timestamp_seconds !== undefined) {
      setCurrentTime(c.timestamp_seconds);
    }
    const shapes = deserializeAnnotations(c.annotation_data);
    setDrawingShapes(shapes);
  };

  const handleCreateComment = async (data: {
    content: string;
    timestamp_seconds: number | null;
    frame_number: number | null;
    annotation_data: Record<string, unknown> | null;
    parent_comment_id?: string;
  }) => {
    await createCommentMutation.mutateAsync({
      organizationId,
      projectId,
      mediaId: currentMedia.id,
      data: {
        content: data.content,
        timestamp_seconds: data.timestamp_seconds ?? undefined,
        frame_number: data.frame_number ?? undefined,
        annotation_data: data.annotation_data ?? undefined,
        parent_comment_id: data.parent_comment_id ?? undefined,
      },
    });
    setDrawingShapes([]);
    await queryClient.invalidateQueries({
      queryKey: getListMediaCommentsQueryKey(organizationId, projectId, currentMedia.id),
    });
    await refetchComments();
  };

  const handleCreateReply = async (parentCommentId: string, content: string) => {
    await createCommentMutation.mutateAsync({
      organizationId,
      projectId,
      mediaId: currentMedia.id,
      data: {
        content,
        parent_comment_id: parentCommentId,
      },
    });
    await queryClient.invalidateQueries({
      queryKey: getListMediaCommentsQueryKey(organizationId, projectId, currentMedia.id),
    });
    await refetchComments();
  };

  const handleResolveToggle = async (commentId: string, status: "open" | "resolved") => {
    await updateCommentMutation.mutateAsync({
      organizationId,
      projectId,
      mediaId: currentMedia.id,
      commentId,
      data: {
        status,
      },
    });
    await queryClient.invalidateQueries({
      queryKey: getListMediaCommentsQueryKey(organizationId, projectId, currentMedia.id),
    });
    await refetchComments();
  };

  const handleDeleteComment = async (commentId: string) => {
    await deleteCommentMutation.mutateAsync({
      organizationId,
      projectId,
      mediaId: currentMedia.id,
      commentId,
    });
    if (activeComment?.id === commentId) {
      setActiveComment(null);
    }
    await queryClient.invalidateQueries({
      queryKey: getListMediaCommentsQueryKey(organizationId, projectId, currentMedia.id),
    });
    await refetchComments();
  };

  const handleSelectVersion = (versionId: string) => {
    const selected = versions.find((v) => v.id === versionId);
    if (selected) {
      setActiveComment(null);
      setDrawingShapes([]);
      router.push(
        `/app/organizations/${organizationSlug}/projects/${projectId}/media/${selected.id}`,
      );
    }
  };

  const isImage = Boolean(
    currentMedia.mime_type.startsWith("image/") ||
    currentMedia.mime_type === "image/svg+xml" ||
    currentMedia.filename?.endsWith(".svg") ||
    currentMedia.filename?.endsWith(".png") ||
    currentMedia.filename?.endsWith(".jpg") ||
    currentMedia.filename?.endsWith(".jpeg") ||
    currentMedia.filename?.endsWith(".webp") ||
    currentMedia.filename?.endsWith(".avif") ||
    currentMedia.filename?.endsWith(".gif")
  );

  return (
    <div className="flex flex-col h-screen w-screen bg-paper overflow-hidden select-none font-sans">
      {/* Top Universal Review Header */}
      <header className="flex h-14 items-center justify-between border-b border-line bg-surface px-4 z-20 flex-shrink-0">
        {/* Left: Breadcrumbs & Back navigation */}
        <div className="flex items-center gap-3">
          <Link
            href={`/app/organizations/${organizationSlug}/projects/${projectId}`}
            className="grid size-8 place-items-center rounded-lg border border-line bg-paper text-muted hover:border-ink hover:text-ink transition shadow-xs"
            title="Back to Project"
          >
            <ArrowLeft size={16} />
          </Link>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-muted">{projectName}</span>
            <span className="text-xs text-muted">/</span>
            <div className="flex items-center gap-1.5 font-bold text-sm text-ink">
              {isImage ? (
                <ImageIcon size={15} className="text-muted" />
              ) : (
                <Film size={15} className="text-muted" />
              )}
              <span className="truncate max-w-[260px]">{currentMedia.title}</span>
            </div>

            {/* Status Badge inline with file info */}
            {currentMedia.status === "ready" && (
              <Badge variant="lime" size="sm" dot>
                Ready
              </Badge>
            )}
            {(currentMedia.status === "processing" || currentMedia.status === "transcoding") && (
              <Badge variant="surface" size="sm" dot>
                Processing
              </Badge>
            )}
            {currentMedia.status === "failed" && (
              <Badge variant="danger" size="sm" dot>
                Failed
              </Badge>
            )}
          </div>
        </div>

        {/* Right: Actions, Realtime Presence & Version Switcher */}
        <div className="flex items-center gap-2.5">
          {/* Active Presence Viewers */}
          <PresenceAvatarGroup users={presenceUsers} />

          {/* In-app Notifications */}
          <NotificationBell organizationId={organizationId} />

          {/* Version Switcher Dropdown */}
          <VersionSwitcher
            currentMedia={currentMedia}
            versions={versions}
            onSelectVersion={handleSelectVersion}
          />

          {/* Review Decision Dropdown */}
          <ReviewDecisionDropdown
            organizationId={organizationId}
            projectId={projectId}
            mediaId={currentMedia.id}
            currentStatus={currentMedia.review_status}
          />

          {currentMedia.stream_url && (
            <Button
              variant="outline"
              size="sm"
              href={currentMedia.stream_url}
              target="_blank"
              rel="noreferrer"
            >
              <Download size={13} />
              <span>Download</span>
            </Button>
          )}

          <Button
            variant="lime"
            size="sm"
            onClick={() => setIsShareOpen(true)}
          >
            <Share2 size={13} />
            <span>Share</span>
          </Button>
        </div>
      </header>

      {/* Main Seamless Review Layout: Viewport on Left, Sidebar on Right */}
      <div className="flex flex-1 min-h-0 bg-paper">
        {/* Left Viewport Deck */}
        <main className="relative z-10 flex-1 min-w-0 h-full">
          {isImage ? (
            <ImageReviewViewer
              media={currentMedia}
              comments={comments}
              activeComment={activeComment}
              onSelectComment={handleSelectComment}
              shapes={drawingShapes}
              onShapesChange={setDrawingShapes}
            />
          ) : (
            <VideoPlayer
              media={currentMedia}
              comments={comments}
              activeComment={activeComment}
              currentTime={currentTime}
              onTimeUpdate={setCurrentTime}
              onSelectComment={handleSelectComment}
              shapes={drawingShapes}
              onShapesChange={setDrawingShapes}
            />
          )}
        </main>

        {/* Right Comments & Annotations Sidebar */}
        <div className="w-88 md:w-96 flex-shrink-0 h-full">
          <CommentSidebar
            comments={comments}
            currentTime={currentTime}
            fps={currentMedia.fps || 24}
            shapes={drawingShapes}
            onClearShapes={() => setDrawingShapes([])}
            activeCommentId={activeComment?.id || null}
            onSelectComment={handleSelectComment}
            onSeek={(s) => setCurrentTime(s)}
            onResolveToggle={handleResolveToggle}
            onDeleteComment={handleDeleteComment}
            onCreateComment={handleCreateComment}
            onCreateReply={handleCreateReply}
            members={mentionMembers}
            isImage={isImage}
          />
        </div>
      </div>

      {/* Share Dialog */}
      <Dialog
        isOpen={isShareOpen}
        onClose={() => {
          setIsShareOpen(false);
          setHasCopied(false);
        }}
        size="md"
      >
        <DialogHeader>
          <DialogCloseButton
            onClick={() => {
              setIsShareOpen(false);
              setHasCopied(false);
            }}
          />
          <DialogEyebrow>Share Workspace</DialogEyebrow>
          <DialogTitle className="text-xl">Share Review Link</DialogTitle>
          <DialogDescription>
            Share this link with your team and clients to collaborate with frame-accurate comments and drawings.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted mb-1.5">
              Review URL
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={typeof window !== "undefined" ? window.location.href : ""}
                className="w-full rounded-xl border border-line bg-paper px-3 py-2 text-xs font-mono text-ink focus:outline-none"
              />
              <Button
                variant={hasCopied ? "lime" : "outline"}
                size="sm"
                onClick={() => {
                  if (typeof window !== "undefined") {
                    navigator.clipboard.writeText(window.location.href);
                    setHasCopied(true);
                    setTimeout(() => setHasCopied(false), 2000);
                  }
                }}
              >
                {hasCopied ? <Check size={13} /> : <Copy size={13} />}
                <span>{hasCopied ? "Copied" : "Copy"}</span>
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-line/60 bg-surface/40 p-3 text-xs space-y-1.5 text-muted">
            <div className="flex items-center justify-between">
              <span>Project:</span>
              <span className="font-semibold text-ink">{projectName}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Media:</span>
              <span className="font-semibold text-ink">{currentMedia.title}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Version:</span>
              <span className="font-semibold text-ink">V{currentMedia.version_number || 1}</span>
            </div>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setIsShareOpen(false);
              setHasCopied(false);
            }}
          >
            Close
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
