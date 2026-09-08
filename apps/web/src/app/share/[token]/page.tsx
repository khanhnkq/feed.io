"use client";

import { ShieldAlert } from "lucide-react";
import React, { use, useEffect, useRef, useState } from "react";

import {
  GuestCommentSidebar,
  GuestDecisionDialog,
  GuestHeader,
  GuestPassphraseGate,
  GuestPlayerView,
  PublicComment,
  ShareDetails,
  StreamDetails,
  useGuestDrawing,
} from "@/modules/review";
import { Button } from "@/modules/ui";

interface GuestSharePageProps {
  params: Promise<{
    token: string;
  }>;
}

export default function GuestSharePage({ params }: GuestSharePageProps) {
  const { token } = use(params);

  // Loading & Error states
  const [isLoading, setIsLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Authentication & Passphrase
  const [passphrase, setPassphrase] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Share details & Media stream
  const [shareDetails, setShareDetails] = useState<ShareDetails | null>(null);
  const [streamDetails, setStreamDetails] = useState<StreamDetails | null>(null);

  // Comments & Review state
  const [comments, setComments] = useState<PublicComment[]>([]);
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [newCommentText, setNewCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [activeComment, setActiveComment] = useState<PublicComment | null>(null);

  // Decision state
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [decisionStatus, setDecisionStatus] = useState<"approved" | "needs_changes" | null>(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [isSubmittingDecision, setIsSubmittingDecision] = useState(false);
  const [currentReviewStatus, setCurrentReviewStatus] = useState("pending");

  // Player state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);

  // Annotation Drawing Tool hook
  const {
    activeTool,
    setActiveTool,
    currentAnnotation,
    clearAnnotation,
    handleCanvasMouseDown,
    handleCanvasMouseMove,
    handleCanvasMouseUp,
  } = useGuestDrawing({
    canvasRef,
    videoRef,
    isPlaying,
    setIsPlaying,
  });

  // Initialize guest name from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedName = localStorage.getItem("feedio_guest_name");
      const savedEmail = localStorage.getItem("feedio_guest_email");
      if (savedName) setGuestName(savedName);
      if (savedEmail) setGuestEmail(savedEmail);
    }
  }, []);

  const loadStreamAndComments = async (pass?: string) => {
    try {
      const headers: Record<string, string> = {};
      if (pass) {
        headers["X-Share-Passphrase"] = pass;
      }

      const streamRes = await fetch(`/api/v1/public/shares/${token}/stream`, { headers });
      if (streamRes.ok) {
        const streamData: StreamDetails = await streamRes.json();
        setStreamDetails(streamData);
      }

      const commentsRes = await fetch(`/api/v1/public/shares/${token}/comments`, { headers });
      if (commentsRes.ok) {
        const commentsData: PublicComment[] = await commentsRes.json();
        setComments(commentsData);
      }
    } catch (err) {
      console.error("Error loading stream or comments:", err);
    }
  };

  const fetchShareDetails = async (pass?: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const headers: Record<string, string> = {};
      if (pass) {
        headers["X-Share-Passphrase"] = pass;
      }

      const res = await fetch(`/api/v1/public/shares/${token}`, { headers });
      if (res.status === 404 || res.status === 410) {
        setErrorStatus(res.status);
        const data = await res.json().catch(() => ({}));
        setErrorMessage(data.detail || "This share link has expired or is invalid.");
        setIsLoading(false);
        return;
      }

      if (!res.ok) {
        throw new Error("Failed to load share details");
      }

      const data: ShareDetails = await res.json();
      setShareDetails(data);
      setCurrentReviewStatus(data.review_status);

      if (data.is_authenticated) {
        await loadStreamAndComments(pass);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Error connecting to server");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchShareDetails();
  }, [token]);

  // Handle Passphrase Unlock
  const handleVerifyPassphrase = async (enteredPassphrase: string) => {
    setIsVerifying(true);
    setVerifyError(null);

    try {
      const res = await fetch(`/api/v1/public/shares/${token}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passphrase: enteredPassphrase }),
      });

      if (!res.ok) {
        throw new Error("Invalid passphrase. Please check and try again.");
      }

      setPassphrase(enteredPassphrase);
      await fetchShareDetails(enteredPassphrase);
    } catch (err: unknown) {
      setVerifyError(err instanceof Error ? err.message : "Failed to verify passphrase");
    } finally {
      setIsVerifying(false);
    }
  };

  // Video Player Controls
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const stepFrame = (frames: number) => {
    if (!videoRef.current) return;
    const fps = shareDetails?.fps || 24;
    const frameDuration = 1 / fps;
    const newTime = Math.max(
      0,
      Math.min(duration, videoRef.current.currentTime + frames * frameDuration),
    );
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  // Submit Guest Comment
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !guestName.trim()) return;

    setIsSubmittingComment(true);
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("feedio_guest_name", guestName.trim());
        if (guestEmail.trim()) localStorage.setItem("feedio_guest_email", guestEmail.trim());
      }

      const fps = shareDetails?.fps || 24;
      const frameNum = Math.round(currentTime * fps);

      const payload = {
        guest_name: guestName.trim(),
        guest_email: guestEmail.trim() || null,
        content: newCommentText.trim(),
        timestamp_seconds: currentTime,
        frame_number: frameNum,
        annotation_data: currentAnnotation || null,
      };

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (passphrase) headers["X-Share-Passphrase"] = passphrase;

      const res = await fetch(`/api/v1/public/shares/${token}/comments`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Failed to post comment");
      }

      const created: PublicComment = await res.json();
      setComments((prev) => [...prev, created]);
      setNewCommentText("");
      clearAnnotation();
      setActiveTool("none");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error posting comment");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Submit Guest Decision
  const handlePostDecision = async () => {
    if (!decisionStatus || !guestName.trim()) return;
    setIsSubmittingDecision(true);

    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("feedio_guest_name", guestName.trim());
      }

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (passphrase) headers["X-Share-Passphrase"] = passphrase;

      const res = await fetch(`/api/v1/public/shares/${token}/decisions`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          guest_name: guestName.trim(),
          status: decisionStatus,
          notes: decisionNote.trim() || null,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to record decision");
      }

      setCurrentReviewStatus(decisionStatus);
      setDecisionModalOpen(false);
      setDecisionNote("");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to record review decision");
    } finally {
      setIsSubmittingDecision(false);
    }
  };

  // Download Master Asset
  const handleDownloadAsset = async () => {
    try {
      const headers: Record<string, string> = {};
      if (passphrase) headers["X-Share-Passphrase"] = passphrase;

      const res = await fetch(`/api/v1/public/shares/${token}/download`, { headers });
      if (!res.ok) throw new Error("Download unavailable");
      const data = await res.json();
      window.open(data.download_url, "_blank");
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to generate download link");
    }
  };

  // 1. Loading screen
  if (isLoading) {
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
  if (errorStatus || !shareDetails) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper p-6 text-ink">
        <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-8 text-center shadow-[6px_6px_0_#11130f] space-y-4">
          <div className="mx-auto grid size-12 place-items-center rounded-full bg-paper text-ink border border-line">
            <ShieldAlert size={24} className="text-ink" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Review Link Unavailable</h1>
          <p className="text-xs text-muted leading-relaxed">
            {errorMessage || "This review share link has expired, was revoked, or does not exist."}
          </p>
          <div className="pt-2">
            <Button variant="outline" href="/" size="sm">
              Return to Feed.io
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Passphrase Gate Screen
  if (shareDetails.has_passphrase && !shareDetails.is_authenticated) {
    return (
      <GuestPassphraseGate
        title={shareDetails.title}
        onVerify={handleVerifyPassphrase}
        isVerifying={isVerifying}
        verifyError={verifyError}
      />
    );
  }

  // 4. Authenticated Guest Review Workspace
  const isVideo = shareDetails.mime_type.startsWith("video/");

  return (
    <div className="flex flex-col h-screen bg-paper text-ink overflow-hidden">
      {/* Top Header */}
      <GuestHeader
        shareDetails={shareDetails}
        currentReviewStatus={currentReviewStatus}
        onDownloadAsset={handleDownloadAsset}
        onOpenDecisionModal={(status) => {
          setDecisionStatus(status);
          setDecisionModalOpen(true);
        }}
      />

      {/* Main Review Body */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Center Media Player View */}
        <GuestPlayerView
          isVideo={isVideo}
          streamUrl={streamDetails?.stream_url || null}
          thumbnailUrl={shareDetails.thumbnail_url}
          title={shareDetails.title}
          fps={shareDetails.fps || 24}
          allowComments={shareDetails.allow_comments}
          videoRef={videoRef}
          canvasRef={canvasRef}
          isPlaying={isPlaying}
          onTogglePlay={togglePlay}
          currentTime={currentTime}
          onTimeUpdate={setCurrentTime}
          duration={duration}
          onDurationChange={setDuration}
          onEnded={() => setIsPlaying(false)}
          onStepFrame={stepFrame}
          onSeek={handleSeek}
          activeTool={activeTool}
          onSelectTool={setActiveTool}
          currentAnnotation={currentAnnotation}
          onClearAnnotation={clearAnnotation}
          playbackRate={playbackRate}
          onChangePlaybackRate={(rate) => {
            setPlaybackRate(rate);
            if (videoRef.current) videoRef.current.playbackRate = rate;
          }}
          isMuted={isMuted}
          onToggleMute={() => {
            if (!videoRef.current) return;
            const nextMute = !isMuted;
            setIsMuted(nextMute);
            videoRef.current.muted = nextMute;
          }}
          handleCanvasMouseDown={handleCanvasMouseDown}
          handleCanvasMouseMove={handleCanvasMouseMove}
          handleCanvasMouseUp={handleCanvasMouseUp}
        />

        {/* Right Sidebar: Comments & Annotations */}
        {shareDetails.allow_comments && (
          <GuestCommentSidebar
            comments={comments}
            activeComment={activeComment}
            onSelectComment={(comment) => {
              setActiveComment(comment);
              if (comment.timestamp_seconds !== null && videoRef.current) {
                videoRef.current.currentTime = comment.timestamp_seconds;
                setCurrentTime(comment.timestamp_seconds);
              }
            }}
            guestName={guestName}
            onGuestNameChange={setGuestName}
            commentText={newCommentText}
            onCommentTextChange={setNewCommentText}
            currentAnnotation={currentAnnotation}
            onClearAnnotation={clearAnnotation}
            isSubmitting={isSubmittingComment}
            onSubmitComment={handlePostComment}
            currentTime={currentTime}
            fps={shareDetails.fps || 24}
          />
        )}
      </div>

      {/* Decision Note Modal */}
      {decisionModalOpen && (
        <GuestDecisionDialog
          isOpen={decisionModalOpen}
          onClose={() => setDecisionModalOpen(false)}
          title={shareDetails.title}
          decisionStatus={decisionStatus}
          guestName={guestName}
          onGuestNameChange={setGuestName}
          decisionNote={decisionNote}
          onDecisionNoteChange={setDecisionNote}
          isSubmitting={isSubmittingDecision}
          onSubmit={handlePostDecision}
        />
      )}
    </div>
  );
}
