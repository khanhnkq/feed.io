"use client";

import {
  client,
  type CommentResponse,
  getGetPublicShareDetailsQueryKey,
  getListPublicShareCommentsQueryKey,
  type MediaResponse,
  useCreatePublicGuestComment,
  useCreatePublicGuestDecision,
  useGetPublicShareDetails,
  useGetPublicShareStream,
  useListPublicShareComments,
  useVerifyPublicSharePassphrase,
} from "@feedio/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { ShieldAlert } from "lucide-react";
import React, { use, useMemo, useState } from "react";

import {
  type AnnotationShape,
  CommentSidebar,
  deserializeAnnotations,
  GuestHeader,
  GuestPassphraseGate,
  GuestPlayerView,
  isSameFrameTime,
  type ReviewStatus,
  ShareDetails,
} from "@/modules/review";
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/modules/ui";

interface GuestSharePageProps {
  params: Promise<{
    token: string;
  }>;
}

export default function GuestSharePage({ params }: GuestSharePageProps) {
  const { token } = use(params);
  const queryClient = useQueryClient();

  // Authentication & Passphrase
  const [passphrase, setPassphrase] = useState("");
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // TanStack Query: Share details
  const shareDetailsRequest = useMemo(
    () => ({ headers: passphrase ? { "X-Share-Passphrase": passphrase } : {} }),
    [passphrase],
  );

  const {
    data: shareDetailsData,
    isLoading: isDetailsLoading,
    error: detailsError,
  } = useGetPublicShareDetails(token, {
    request: shareDetailsRequest,
    query: {
      retry: false,
    },
  });

  const shareDetails = (shareDetailsData as ShareDetails) || null;
  const isAuthenticated = Boolean(shareDetails?.is_authenticated);

  // TanStack Query: Media stream details
  const { data: streamData } = useGetPublicShareStream(token, {
    request: shareDetailsRequest,
    query: {
      enabled: Boolean(token && isAuthenticated),
    },
  });

  const streamPayload = streamData as {
    stream_url?: string;
    proxy_url?: string;
    direct_url?: string;
    hls_url?: string;
  } | undefined;

  const streamUrl = streamPayload?.stream_url || null;
  const proxyUrl =
    streamPayload?.proxy_url || streamPayload?.direct_url || streamPayload?.stream_url || null;
  const hlsUrl = streamPayload?.hls_url || null;

  // TanStack Query: Comments
  const { data: rawComments = [] } = useListPublicShareComments(token, {
    request: shareDetailsRequest,
    query: {
      enabled: Boolean(token && isAuthenticated),
    },
  });

  const comments = rawComments as unknown as CommentResponse[];

  // Guest identity from localStorage
  const [guestName, setGuestName] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("feedio_guest_name") || "";
    }
    return "";
  });
  const [guestEmail] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("feedio_guest_email") || "";
    }
    return "";
  });

  // Active comment & review status
  const [activeComment, setActiveComment] = useState<CommentResponse | null>(null);
  const [currentReviewStatus, setCurrentReviewStatus] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [drawingShapes, setDrawingShapes] = useState<AnnotationShape[]>([]);

  const reviewStatus = currentReviewStatus || shareDetails?.review_status || "pending";

  // Mutations
  const verifyMutation = useVerifyPublicSharePassphrase({
    mutation: {
      onSuccess: (_data, variables) => {
        setPassphrase(variables.data.passphrase);
        queryClient.invalidateQueries({ queryKey: getGetPublicShareDetailsQueryKey(token) });
      },
      onError: (err: unknown) => {
        const apiErr = err as { response?: { data?: { detail?: string } }; message?: string };
        setVerifyError(
          apiErr.response?.data?.detail || apiErr.message || "Invalid passphrase. Please try again.",
        );
      },
    },
  });

  const createCommentMutation = useCreatePublicGuestComment({
    request: shareDetailsRequest,
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPublicShareCommentsQueryKey(token) });
      },
      onError: (err: unknown) => {
        const apiErr = err as { response?: { data?: { detail?: string } }; message?: string };
        alert(apiErr.response?.data?.detail || apiErr.message || "Failed to post comment");
      },
    },
  });

  const createDecisionMutation = useCreatePublicGuestDecision({
    request: shareDetailsRequest,
    mutation: {
      onSuccess: (_data, variables) => {
        setCurrentReviewStatus(variables.data.status);
        queryClient.invalidateQueries({ queryKey: getGetPublicShareDetailsQueryKey(token) });
      },
      onError: (err: unknown) => {
        const apiErr = err as { response?: { data?: { detail?: string } }; message?: string };
        alert(apiErr.response?.data?.detail || apiErr.message || "Failed to record review decision");
      },
    },
  });

  // Handlers
  const handleVerifyPassphrase = async (enteredPassphrase: string) => {
    setVerifyError(null);
    verifyMutation.mutate({
      token,
      data: { passphrase: enteredPassphrase },
    });
  };

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

  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time);
    const fps = shareDetails?.fps || 24;
    if (
      activeComment &&
      activeComment.timestamp_seconds !== null &&
      activeComment.timestamp_seconds !== undefined &&
      !isSameFrameTime(time, activeComment.timestamp_seconds, fps)
    ) {
      setActiveComment(null);
      setDrawingShapes([]);
    }
  };

  const handleCreateComment = async (data: {
    content: string;
    timestamp_seconds: number | null;
    frame_number: number | null;
    annotation_data: Record<string, unknown> | null;
    parent_comment_id?: string;
    guest_name?: string;
  }) => {
    const authorName = data.guest_name || guestName;
    if (!authorName.trim()) return;

    if (typeof window !== "undefined") {
      localStorage.setItem("feedio_guest_name", authorName.trim());
      if (guestEmail.trim()) localStorage.setItem("feedio_guest_email", guestEmail.trim());
    }

    await createCommentMutation.mutateAsync({
      token,
      data: {
        guest_name: authorName.trim(),
        guest_email: guestEmail.trim() || null,
        content: data.content.trim(),
        timestamp_seconds: data.timestamp_seconds,
        frame_number: data.frame_number,
        annotation_data: data.annotation_data
          ? (data.annotation_data as unknown as Record<string, unknown>)
          : undefined,
        parent_comment_id: data.parent_comment_id ?? undefined,
      },
    });
    setDrawingShapes([]);
  };

  const handleCreateReply = async (parentCommentId: string, content: string, replyGuestName?: string) => {
    const authorName = replyGuestName || guestName;
    if (!authorName.trim()) return;

    if (typeof window !== "undefined") {
      localStorage.setItem("feedio_guest_name", authorName.trim());
    }

    await createCommentMutation.mutateAsync({
      token,
      data: {
        guest_name: authorName.trim(),
        guest_email: guestEmail.trim() || null,
        content: content.trim(),
        parent_comment_id: parentCommentId,
      },
    });
  };

  const handleGuestSubmitDecision = async (
    status: ReviewStatus,
    notes: string,
    submitterName: string,
  ) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("feedio_guest_name", submitterName.trim());
    }

    await createDecisionMutation.mutateAsync({
      token,
      data: {
        guest_name: submitterName.trim(),
        status,
        notes: notes.trim() || null,
      },
    });
  };

  const handleDownloadAsset = async () => {
    try {
      const headers: Record<string, string> = {};
      if (passphrase) headers["X-Share-Passphrase"] = passphrase;
      const { data } = await client.get<{ download_url: string }>(
        `/api/v1/public/shares/${token}/download`,
        { headers },
      );
      if (data?.download_url) {
        window.open(data.download_url, "_blank");
      }
    } catch {
      alert("Failed to generate download link");
    }
  };

  // 1. Loading screen
  if (isDetailsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper text-ink">
        <div className="text-center space-y-4">
          <div className="mx-auto size-10 animate-spin rounded-full border-4 border-line border-t-ink" />
          <p className="text-xs font-mono uppercase tracking-widest text-muted">
            Accessing Review Workspace...
          </p>
        </div>
      </div>
    );
  }

  // 2. Expired / Revoked / Not Found Screen
  if (detailsError || !shareDetails) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper p-6 text-ink">
        <Card className="w-full max-w-md border-line bg-surface p-8 text-center shadow-[7px_7px_0_#11130f]">
          <CardHeader className="flex flex-col items-center justify-center">
            <div className="mx-auto grid size-12 place-items-center rounded-full bg-paper text-ink border border-line">
              <ShieldAlert size={24} className="text-ink" />
            </div>
          </CardHeader>
          <CardTitle className="text-xl font-bold tracking-tight mt-4">
            Review Link Unavailable
          </CardTitle>
          <CardDescription className="text-xs text-muted mt-2 leading-relaxed">
            This review share link has expired, was revoked, or does not exist.
          </CardDescription>
          <CardContent className="mt-6 flex justify-center">
            <Button variant="outline" href="/" size="sm">
              Return to Feed.io
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 3. Passphrase Gate Screen
  if (shareDetails.has_passphrase && !shareDetails.is_authenticated) {
    return (
      <GuestPassphraseGate
        title={shareDetails.title}
        onVerify={handleVerifyPassphrase}
        isVerifying={verifyMutation.isPending}
        verifyError={verifyError}
      />
    );
  }

  // 4. Authenticated Guest Review Workspace
  const isImage = Boolean(
    shareDetails.mime_type?.startsWith("image/") ||
    shareDetails.mime_type === "image/svg+xml" ||
    shareDetails.filename?.endsWith(".svg") ||
    shareDetails.filename?.endsWith(".png") ||
    shareDetails.filename?.endsWith(".jpg") ||
    shareDetails.filename?.endsWith(".jpeg") ||
    shareDetails.filename?.endsWith(".webp") ||
    shareDetails.filename?.endsWith(".avif") ||
    shareDetails.filename?.endsWith(".gif")
  );

  const mediaAdapter: MediaResponse = {
    id: shareDetails.media_id,
    organization_id: "",
    project_id: "",
    title: shareDetails.title,
    filename: shareDetails.filename,
    file_size_bytes: 0,
    mime_type: shareDetails.mime_type,
    storage_key: "",
    thumbnail_url: shareDetails.thumbnail_url,
    stream_url: streamUrl || undefined,
    proxy_url: proxyUrl || undefined,
    hls_stream_url: hlsUrl || undefined,
    duration_seconds: shareDetails.duration_seconds,
    fps: shareDetails.fps || 24,
    width: shareDetails.width,
    height: shareDetails.height,
    review_status: reviewStatus,
    status: "ready",
    waveform_data: shareDetails.waveform_data,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return (
    <div className="flex flex-col h-screen bg-paper text-ink overflow-hidden font-sans">
      <GuestHeader
        shareDetails={shareDetails}
        currentReviewStatus={reviewStatus}
        onDownloadAsset={handleDownloadAsset}
        guestName={guestName}
        onGuestNameChange={setGuestName}
        onGuestSubmitDecision={handleGuestSubmitDecision}
        onDecisionUpdated={(status) => setCurrentReviewStatus(status)}
      />

      <div className="flex flex-1 min-h-0 bg-paper">
        <main className="relative z-10 flex-1 min-w-0 h-full">
          <GuestPlayerView
            media={mediaAdapter}
            isVideo={!isImage}
            comments={comments}
            activeComment={activeComment}
            currentTime={currentTime}
            onTimeUpdate={handleTimeUpdate}
            onSelectComment={handleSelectComment}
            shapes={drawingShapes}
            onShapesChange={setDrawingShapes}
          />
        </main>

        {shareDetails.allow_comments && (
          <div className="w-88 md:w-96 flex-shrink-0 h-full">
            <CommentSidebar
              comments={comments}
              currentTime={currentTime}
              fps={shareDetails.fps || 24}
              shapes={drawingShapes}
              onClearShapes={() => setDrawingShapes([])}
              activeCommentId={activeComment?.id || null}
              onSelectComment={handleSelectComment}
              onSeek={(s) => setCurrentTime(s)}
              onCreateComment={handleCreateComment}
              onCreateReply={handleCreateReply}
              isImage={isImage}
              isGuest={true}
              guestName={guestName}
              onGuestNameChange={setGuestName}
            />
          </div>
        )}
      </div>
    </div>
  );
}
