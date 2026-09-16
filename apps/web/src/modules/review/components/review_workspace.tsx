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
import { ArrowLeft, Columns2, Download, Film, ImageIcon, Share2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "../../ui/components/badge";
import { Button } from "../../ui/components/button";
import { type AnnotationShape, deserializeAnnotations } from "../lib/annotation_serializer";
import { CommentSidebar } from "./comments/comment_sidebar";
import { ImageReviewViewer } from "./image/image_review_viewer";
import { VideoPlayer } from "./player/video_player";
import { VersionCompareWorkspace } from "./versions/version_compare_workspace";
import { VersionSwitcher } from "./versions/version_switcher";
import { UploadVersionDialog } from "./versions/upload_version_dialog";
import { ReviewDecisionDropdown } from "./decisions/review_decision_dropdown";
import { useRealtimeMedia } from "../../collaboration/hooks/use_realtime_media";
import { PresenceAvatarGroup } from "../../collaboration/components/presence_avatar_group";
import { NotificationBell } from "../../notifications/components/notification_bell";
import { ShareMediaDialog } from "../../media/components/share_media_dialog";

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
  const [isUploadVersionOpen, setIsUploadVersionOpen] = useState(false);

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

  const invalidateComments = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: getListMediaCommentsQueryKey(organizationId, projectId, currentMedia.id),
    });
    refetchComments();
  }, [currentMedia.id, organizationId, projectId, queryClient, refetchComments]);

  const { presenceUsers } = useRealtimeMedia({
    mediaId: currentMedia.id,
    userId: currentUser?.id,
    userName: currentUser?.display_name,
    userEmail: currentUser?.email,
    enabled: Boolean(currentMedia?.id),
    onCommentCreated: () => invalidateComments(),
    onCommentUpdated: () => invalidateComments(),
    onCommentDeleted: (payload) => {
      if (activeComment?.id === payload.comment_id) {
        setActiveComment(null);
        setDrawingShapes([]);
      }
      invalidateComments();
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

  const currentMember = orgMembersData?.items?.find((m) => m.user_id === currentUser?.id);
  const canDeleteAnyComment =
    currentMember?.organization_role === "owner" ||
    currentMember?.organization_role === "admin";

  // 5. Comment Mutations
  const createCommentMutation = useCreateComment();
  const updateCommentMutation = useUpdateComment();
  const deleteCommentMutation = useDeleteComment();

  const handleSelectComment = useCallback(
    (c: CommentResponse | null) => {
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
    },
    [activeComment?.id],
  );

  const searchParams = useSearchParams();
  const targetCommentId = searchParams?.get("commentId");
  const compareWithId = searchParams?.get("compareWith");
  const [isComparing, setIsComparing] = useState(Boolean(compareWithId));
  const [compareMedia, setCompareMedia] = useState<MediaResponse | null>(null);

  useEffect(() => {
    if (compareWithId && versions.length > 0) {
      const match = versions.find((v) => v.id === compareWithId);
      if (match) {
        setCompareMedia(match);
        setIsComparing(true);
      }
    }
  }, [compareWithId, versions]);

  // Auto-select and seek to comment when navigating from notification deep link
  useEffect(() => {
    if (targetCommentId && comments.length > 0 && !activeComment) {
      const target = comments.find((c) => c.id === targetCommentId);
      if (target) {
        handleSelectComment(target);
      }
    }
  }, [targetCommentId, comments, activeComment, handleSelectComment]);

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
    invalidateComments();
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
    invalidateComments();
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
    invalidateComments();
  };

  const handleSelectVersion = (versionId: string) => {
    setActiveComment(null);
    setDrawingShapes([]);
    router.push(
      `/app/organizations/${organizationSlug}/projects/${projectId}/media/${versionId}`,
    );
  };

  const isImage = Boolean(
    currentMedia.mime_type.startsWith("image/") ||
    /\.(svg|png|jpe?g|webp|avif|gif)$/i.test(currentMedia.filename || "")
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "c" || e.key === "C") {
        if (versions.length > 1 && !isImage) {
          e.preventDefault();
          setIsComparing((prev) => !prev);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [versions.length, isImage]);

  const otherVersion = compareMedia || versions.find((v) => v.id !== currentMedia.id);

  if (isComparing && otherVersion) {
    return (
      <VersionCompareWorkspace
        initialMediaA={currentMedia}
        initialMediaB={otherVersion}
        versions={versions}
        onCloseCompare={() => {
          setIsComparing(false);
          const url = new URL(window.location.href);
          url.searchParams.delete("compareWith");
          router.replace(url.pathname + (url.search ? url.search : ""));
        }}
        onSelectVersionA={(v) => {
          router.push(
            `/app/organizations/${organizationSlug}/projects/${projectId}/media/${v.id}?compareWith=${otherVersion.id}`,
          );
        }}
        onSelectVersionB={(v) => setCompareMedia(v)}
      />
    );
  }

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
            <Badge
              variant={currentMedia.status === "ready" ? "lime" : currentMedia.status === "failed" ? "danger" : "surface"}
              size="sm"
              dot
            >
              {currentMedia.status === "ready" ? "Ready" : currentMedia.status === "failed" ? "Failed" : "Processing"}
            </Badge>
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
            onUploadVersion={() => setIsUploadVersionOpen(true)}
          />

          {/* Version Compare Toggle */}
          {versions.length > 1 && !isImage && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsComparing(true)}
              className="border-line bg-paper text-ink hover:border-ink hover:bg-surface"
              title="Compare Versions (Press C)"
            >
              <Columns2 size={13} />
              <span>Compare</span>
            </Button>
          )}

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
            currentUserId={currentUser?.id}
            canDeleteAnyComment={canDeleteAnyComment}
          />
        </div>
      </div>

      {/* Share Dialog */}
      <ShareMediaDialog
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        organizationId={organizationId}
        projectId={projectId}
        mediaId={currentMedia.id}
        mediaTitle={currentMedia.title}
      />

      {/* Upload New Version Dialog */}
      {isUploadVersionOpen && (
        <UploadVersionDialog
          isOpen={isUploadVersionOpen}
          onClose={() => setIsUploadVersionOpen(false)}
          organizationId={organizationId}
          projectId={projectId}
          targetMedia={currentMedia}
          onVersionCreated={(newMedia) => {
            setIsUploadVersionOpen(false);
            handleSelectVersion(newMedia.id);
          }}
        />
      )}
    </div>
  );
}
