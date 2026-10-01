"use client";

import {
  type CommentResponse,
  getListMediaCommentsQueryKey,
  type MediaResponse,
  useCreateComment,
  useDeleteComment,
  useGetCurrentUser,
  useGetMediaVersions,
  useGetMyProfile,
  useListMediaComments,
  useListOrganizationMembers,
  useUpdateComment,
} from "@feedio/api-client";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Columns2,
  Download,
  Film,
  ImageIcon,
  Share2,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "../../ui/components/badge";
import { Button } from "../../ui/components/button";
import {
  type AnnotationShape,
  deserializeAnnotations,
} from "../lib/annotation_serializer";
import {
  updateCommentInList,
  removeCommentFromList,
  upsertCommentInList,
} from "../lib/comment_tree_utils";
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
import { UpgradeModal } from "../../billing/components/upgrade_modal";
import { useOrganizationBilling } from "../../billing/hooks/use_billing";
import { NleExportDialog } from "./nle/nle_export_dialog";

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
  const [activeComment, setActiveComment] = useState<CommentResponse | null>(
    null,
  );
  const [currentTime, setCurrentTime] = useState(0);
  const [drawingShapes, setDrawingShapes] = useState<AnnotationShape[]>([]);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isUploadVersionOpen, setIsUploadVersionOpen] = useState(false);
  const [isNleExportOpen, setIsNleExportOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState<
    "general" | "storage_limit" | "member_limit" | "pro_features"
  >("general");
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (!actionError) return;
    const timer = setTimeout(() => setActionError(null), 4000);
    return () => clearTimeout(timer);
  }, [actionError]);

  // Fetch Billing Info & Feature Gating
  const { data: billingData } = useOrganizationBilling(organizationId);
  const isPaidPlan = Boolean(
    billingData?.plan_tier && billingData.plan_tier !== "free",
  );
  const hasNleAccess = isPaidPlan;
  const hasCompareAccess = isPaidPlan;

  // 1. Fetch Comments
  const { data: comments = [], refetch: refetchComments } =
    useListMediaComments(organizationId, projectId, currentMedia.id, {
      query: {
        enabled: Boolean(organizationId && projectId && currentMedia.id),
      },
    });

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
  const { data: profile } = useGetMyProfile();

  const invalidateComments = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: getListMediaCommentsQueryKey(
        organizationId,
        projectId,
        currentMedia.id,
      ),
    });
    refetchComments();
  }, [
    currentMedia.id,
    organizationId,
    projectId,
    queryClient,
    refetchComments,
  ]);

  const { presenceUsers } = useRealtimeMedia({
    mediaId: currentMedia.id,
    userId: currentUser?.id,
    userName: profile?.display_name || currentUser?.email,
    userEmail: currentUser?.email,
    userAvatar: profile?.avatar_url || undefined,
    enabled: Boolean(currentMedia?.id),
    onCommentCreated: (payload) => {
      if (!payload?.comment) return;
      const queryKey = getListMediaCommentsQueryKey(
        organizationId,
        projectId,
        currentMedia.id,
      );
      queryClient.setQueryData<CommentResponse[]>(queryKey, (old) => {
        return old
          ? upsertCommentInList(old, payload.comment as CommentResponse)
          : [payload.comment as CommentResponse];
      });
    },
    onCommentUpdated: (payload) => {
      if (!payload?.comment) return;
      const queryKey = getListMediaCommentsQueryKey(
        organizationId,
        projectId,
        currentMedia.id,
      );
      queryClient.setQueryData<CommentResponse[]>(queryKey, (old) => {
        return old
          ? updateCommentInList(
              old,
              payload.comment.id,
              () => payload.comment as CommentResponse,
            )
          : [payload.comment as CommentResponse];
      });
      if (activeComment?.id === payload.comment.id) {
        setActiveComment(payload.comment as CommentResponse);
      }
    },
    onCommentDeleted: (payload) => {
      if (!payload?.comment_id) return;
      if (activeComment?.id === payload.comment_id) {
        setActiveComment(null);
        setDrawingShapes([]);
      }
      const queryKey = getListMediaCommentsQueryKey(
        organizationId,
        projectId,
        currentMedia.id,
      );
      queryClient.setQueryData<CommentResponse[]>(queryKey, (old) => {
        return old ? removeCommentFromList(old, payload.comment_id) : [];
      });
    },
  });

  // 4. Organization Members for Mentions
  const { data: orgMembersData } = useListOrganizationMembers(
    organizationId,
    undefined,
    {
      query: { enabled: Boolean(organizationId) },
    },
  );

  const mentionMembers = useMemo(() => {
    const map = new Map<string, { id: string; name: string; email?: string; avatar_url?: string }>();
    orgMembersData?.items?.forEach((m) => {
      map.set(m.user_id, { id: m.user_id, name: m.display_name || m.email.split("@")[0], email: m.email });
    });
    presenceUsers.forEach((p) => {
      if (!map.has(p.user_id)) {
        map.set(p.user_id, { id: p.user_id, name: p.name, email: p.email || undefined, avatar_url: p.avatar_url || undefined });
      }
    });
    return Array.from(map.values());
  }, [orgMembersData, presenceUsers]);

  const currentMember = orgMembersData?.items?.find(
    (m) => m.user_id === currentUser?.id,
  );
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
    try {
      const queryKey = getListMediaCommentsQueryKey(
        organizationId,
        projectId,
        currentMedia.id,
      );
      const res = await createCommentMutation.mutateAsync({
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
      queryClient.setQueryData<CommentResponse[]>(queryKey, (old) => {
        return old ? upsertCommentInList(old, res) : [res];
      });
    } catch (err: unknown) {
      const apiErr = err as {
        response?: { data?: { detail?: string } };
        message?: string;
      };
      setActionError(
        apiErr.response?.data?.detail ||
          apiErr.message ||
          "Failed to post comment",
      );
    }
  };

  const handleCreateReply = async (
    parentCommentId: string,
    content: string,
  ) => {
    try {
      const queryKey = getListMediaCommentsQueryKey(
        organizationId,
        projectId,
        currentMedia.id,
      );
      const res = await createCommentMutation.mutateAsync({
        organizationId,
        projectId,
        mediaId: currentMedia.id,
        data: {
          content,
          parent_comment_id: parentCommentId,
        },
      });
      queryClient.setQueryData<CommentResponse[]>(queryKey, (old) => {
        return old ? upsertCommentInList(old, res) : [res];
      });
    } catch (err: unknown) {
      const apiErr = err as {
        response?: { data?: { detail?: string } };
        message?: string;
      };
      setActionError(
        apiErr.response?.data?.detail ||
          apiErr.message ||
          "Failed to post reply",
      );
    }
  };

  const handleResolveToggle = async (
    commentId: string,
    status: "open" | "resolved",
  ) => {
    const queryKey = getListMediaCommentsQueryKey(
      organizationId,
      projectId,
      currentMedia.id,
    );

    // 1. Snapshot previous state for rollback
    const previousComments =
      queryClient.getQueryData<CommentResponse[]>(queryKey);
    const previousActiveComment = activeComment;

    // 2. Optimistic Update (0ms)
    queryClient.setQueryData<CommentResponse[]>(queryKey, (old) => {
      if (!old) return [];
      return updateCommentInList(old, commentId, (c) => ({
        ...c,
        status,
      }));
    });

    if (activeComment?.id === commentId) {
      setActiveComment((prev) => (prev ? { ...prev, status } : null));
    }

    // 3. Background API Request
    try {
      const serverUpdated = await updateCommentMutation.mutateAsync({
        organizationId,
        projectId,
        mediaId: currentMedia.id,
        commentId,
        data: {
          status,
        },
      });

      // Merge server response to ensure full sync without refetch
      queryClient.setQueryData<CommentResponse[]>(queryKey, (old) => {
        if (!old) return [serverUpdated];
        return updateCommentInList(old, commentId, () => serverUpdated);
      });
      if (activeComment?.id === commentId) {
        setActiveComment(serverUpdated);
      }
    } catch (err: unknown) {
      // 4. Rollback on failure
      if (previousComments) {
        queryClient.setQueryData(queryKey, previousComments);
      }
      if (previousActiveComment?.id === commentId) {
        setActiveComment(previousActiveComment);
      }
      const apiErr = err as {
        response?: { data?: { detail?: string } };
        message?: string;
      };
      setActionError(
        apiErr.response?.data?.detail ||
          apiErr.message ||
          "Failed to update comment status",
      );
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    const queryKey = getListMediaCommentsQueryKey(
      organizationId,
      projectId,
      currentMedia.id,
    );

    // 1. Snapshot previous state for rollback
    const previousComments =
      queryClient.getQueryData<CommentResponse[]>(queryKey);
    const previousActiveComment = activeComment;

    // 2. Optimistic Delete (0ms)
    queryClient.setQueryData<CommentResponse[]>(queryKey, (old) => {
      if (!old) return [];
      return removeCommentFromList(old, commentId);
    });

    if (activeComment?.id === commentId) {
      setActiveComment(null);
      setDrawingShapes([]);
    }

    // 3. Background API Request
    try {
      await deleteCommentMutation.mutateAsync({
        organizationId,
        projectId,
        mediaId: currentMedia.id,
        commentId,
      });
    } catch (err: unknown) {
      // 4. Rollback on failure
      if (previousComments) {
        queryClient.setQueryData(queryKey, previousComments);
      }
      if (previousActiveComment?.id === commentId) {
        setActiveComment(previousActiveComment);
      }
      const apiErr = err as {
        response?: { data?: { detail?: string } };
        message?: string;
      };
      setActionError(
        apiErr.response?.data?.detail ||
          apiErr.message ||
          "Failed to delete comment",
      );
    }
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
    /\.(svg|png|jpe?g|webp|avif|gif)$/i.test(currentMedia.filename || ""),
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;
      if (e.key === "c" || e.key === "C") {
        if (versions.length > 1) {
          e.preventDefault();
          if (!hasCompareAccess) {
            setUpgradeReason("general");
            setIsUpgradeModalOpen(true);
          } else {
            setIsComparing((prev) => !prev);
          }
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [versions.length, hasCompareAccess]);

  const otherVersion =
    compareMedia || versions.find((v) => v.id !== currentMedia.id);

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
      <header className="flex h-14 items-center justify-between border-b border-line bg-surface px-4 z-40 flex-shrink-0">
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
              {isImage ? <ImageIcon size={15} className="text-muted" /> : <Film size={15} className="text-muted" />}
              <span className="truncate max-w-[260px]">{currentMedia.title}</span>
            </div>

            {/* Status Badge inline with file info */}
            <Badge
              variant={currentMedia.status === "ready" ? "lime" : currentMedia.status === "failed" ? "danger" : "surface"}
              size="sm"
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

          {/* Review Decision Dropdown */}
          <ReviewDecisionDropdown
            organizationId={organizationId}
            projectId={projectId}
            mediaId={currentMedia.id}
            mediaTitle={currentMedia.title}
            currentStatus={currentMedia.review_status}
          />

          {/* Version Switcher Dropdown */}
          <VersionSwitcher
            currentMedia={currentMedia}
            versions={versions}
            onSelectVersion={handleSelectVersion}
            onUploadVersion={() => setIsUploadVersionOpen(true)}
          />

          {/* Version Compare Toggle */}
          {versions.length > 1 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (!hasCompareAccess) {
                  setUpgradeReason("general");
                  setIsUpgradeModalOpen(true);
                  return;
                }
                setIsComparing(true);
              }}
              className="border-line bg-paper text-ink hover:border-ink hover:bg-surface"
              title={
                hasCompareAccess
                  ? "Compare Versions (Press C)"
                  : "Version Compare (Pro Feature)"
              }
            >
              <Columns2 size={13} />
              <span>Compare</span>
              {!hasCompareAccess && (
                <Badge variant="surface" size="sm" className="ml-1 text-[9px] px-1 py-0">
                  PRO
                </Badge>
              )}
            </Button>
          )}

          {/* NLE Marker Export */}
          {!isImage && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsNleExportOpen(true)}
              className="border-line bg-paper text-ink hover:border-ink hover:bg-surface"
              title="Export NLE Timeline Markers (Premiere, Resolve, FCPX)"
            >
              <Film size={13} />
              <span>Export Markers</span>
              {!hasNleAccess && (
                <Badge variant="surface" size="sm" className="ml-1 text-[9px] px-1 py-0">
                  PRO
                </Badge>
              )}
            </Button>
          )}

          {currentMedia.stream_url && (
            <Button variant="outline" size="sm" href={currentMedia.stream_url} target="_blank" rel="noreferrer">
              <Download size={13} />
              <span>Download</span>
            </Button>
          )}

          <Button variant="lime" size="sm" onClick={() => setIsShareOpen(true)}>
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

      {/* NLE Marker Export Dialog */}
      <NleExportDialog
        isOpen={isNleExportOpen}
        onClose={() => setIsNleExportOpen(false)}
        media={currentMedia}
        comments={comments}
        hasNleAccess={hasNleAccess}
        onOpenUpgrade={() => {
          setUpgradeReason("general");
          setIsUpgradeModalOpen(true);
        }}
      />

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        organizationId={organizationId}
        organizationSlug={organizationSlug}
        reason={upgradeReason}
        currentPlanTier={billingData?.plan_tier || "free"}
      />

      {/* Floating Error Toast */}
      {actionError && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-lg bg-red-600 px-4 py-3 text-sm font-medium text-white shadow-lg animate-in fade-in slide-in-from-bottom-2">
          <span>{actionError}</span>
          <button
            onClick={() => setActionError(null)}
            className="ml-2 text-white/80 hover:text-white"
            aria-label="Close error toast"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
