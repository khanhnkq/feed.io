"use client";

import type { MediaResponse } from "@feedio/api-client";
import { ArrowLeft, ArrowLeftRight } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "../../../ui";
import { useSynchronizedPlayback } from "../../hooks/use_synchronized_playback";
import { CompareFooter } from "./compare_footer";
import { CompareVersionDropdown } from "./compare_version_dropdown";
import { VersionCompareViewport } from "./version_compare_viewport";
import { ImageCompareViewport } from "./image_compare_viewport";

export interface VersionCompareWorkspaceProps {
  initialMediaA: MediaResponse;
  initialMediaB: MediaResponse;
  versions: MediaResponse[];
  onCloseCompare: () => void;
  onSelectVersionA?: (media: MediaResponse) => void;
  onSelectVersionB?: (media: MediaResponse) => void;
}

export function VersionCompareWorkspace({
  initialMediaA,
  initialMediaB,
  versions,
  onCloseCompare,
  onSelectVersionA,
  onSelectVersionB,
}: VersionCompareWorkspaceProps) {
  const [mediaA, setMediaA] = useState<MediaResponse>(initialMediaA);
  const [mediaB, setMediaB] = useState<MediaResponse>(initialMediaB);
  const isImage = Boolean(
    mediaA.mime_type.startsWith("image/") ||
      /\.(svg|png|jpe?g|webp|avif|gif)$/i.test(mediaA.filename || ""),
  );

  const fps = mediaA.fps || mediaB.fps || 24;
  const durationA = mediaA.duration_seconds || 0;
  const durationB = mediaB.duration_seconds || 0;

  const {
    videoARef,
    videoBRef,
    isPlaying,
    currentTime,
    totalDuration,
    playbackRate,
    mode,
    wipePosition,
    audioRouting,
    setMode,
    setWipePosition,
    setAudioRouting,
    setPlaybackRate,
    togglePlay,
    seek,
    stepFrame,
  } = useSynchronizedPlayback({
    fps,
    durationA,
    durationB,
  });

  // Source URL: for images prefer stream/proxy/thumbnail; for videos prefer proxy/stream/HLS
  const getVideoSrc = (m: MediaResponse) =>
    m.proxy_url || m.stream_url || m.hls_stream_url || "";
  const getImageSrc = (m: MediaResponse) =>
    m.stream_url || m.proxy_url || m.thumbnail_url || "";
  const getSrc = isImage ? getImageSrc : getVideoSrc;
  const srcA = getSrc(mediaA);
  const srcB = getSrc(mediaB);

  const handleSelectA = (found: MediaResponse) => {
    setMediaA(found);
    onSelectVersionA?.(found);
  };

  const handleSelectB = (found: MediaResponse) => {
    setMediaB(found);
    onSelectVersionB?.(found);
  };

  const handleSwapVersions = () => {
    const tempA = mediaA;
    const tempB = mediaB;
    setMediaA(tempB);
    setMediaB(tempA);
    onSelectVersionA?.(tempB);
    onSelectVersionB?.(tempA);
  };

  // Image viewport controls state
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleResetZoom = useCallback(() => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  const handleRotate = useCallback((delta: number) => {
    setRotation((prev) => {
      const next = (prev + delta) % 360;
      return next < 0 ? next + 360 : next;
    });
  }, []);

  const handleResetView = useCallback(() => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
    setRotation(0);
  }, []);

  const containerRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      if (containerRef.current) {
        containerRef.current.requestFullscreen().catch(() => {});
      } else {
        document.documentElement.requestFullscreen().catch(() => {});
      }
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Global Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      if (e.key === "1") {
        setMode("side_by_side");
      } else if (e.key === "2") {
        setMode("wipe");
      } else if (!isImage) {
        if (e.code === "Space") {
          e.preventDefault();
          togglePlay();
        } else if (e.code === "ArrowLeft") {
          e.preventDefault();
          stepFrame(e.shiftKey ? -5 : -1);
        } else if (e.code === "ArrowRight") {
          e.preventDefault();
          stepFrame(e.shiftKey ? 5 : 1);
        }
      } else {
        if (e.key === "+" || e.key === "=") {
          e.preventDefault();
          setZoom((prev) => Math.min(4, Number((prev + 0.25).toFixed(2))));
        } else if (e.key === "-" || e.key === "_") {
          e.preventDefault();
          setZoom((prev) => Math.max(0.25, Number((prev - 0.25).toFixed(2))));
        } else if (e.key === "0") {
          e.preventDefault();
          handleResetView();
        } else if (e.key.toLowerCase() === "r") {
          e.preventDefault();
          handleRotate(90);
        } else if (e.key.toLowerCase() === "f") {
          e.preventDefault();
          toggleFullscreen();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    togglePlay,
    stepFrame,
    setMode,
    isImage,
    handleResetView,
    handleRotate,
    toggleFullscreen,
  ]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 flex flex-col h-screen w-screen bg-paper text-ink select-none overflow-hidden font-sans"
    >
      {/* Top Bar: Navigation, Version Selectors & Sync Stats */}
      {!isFullscreen && (
        <header className="flex h-14 items-center justify-between border-b border-line bg-surface px-4 shrink-0 z-30">
          {/* Left: Back button & Breadcrumb Title */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onCloseCompare}
              className="grid size-8 place-items-center rounded-lg border border-line bg-paper text-muted hover:border-ink hover:text-ink transition shadow-xs cursor-pointer"
              title="Return to single view"
              aria-label="Return to single view"
            >
              <ArrowLeft size={16} />
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted font-mono tracking-wider font-bold">
                Compare
              </span>
              <span className="text-xs text-muted">/</span>
              <span className="font-bold text-sm text-ink truncate max-w-[200px] md:max-w-[320px]">
                {mediaA.title}
              </span>
              <Badge
                variant="outline"
                size="sm"
                className="font-mono text-[10px] hidden sm:inline-flex"
              >
                V{mediaA.version_number ?? 1} vs V{mediaB.version_number ?? 1}
              </Badge>
            </div>
          </div>

          {/* Right: Version Selectors & Single View Button */}
          <div className="flex items-center gap-2.5">
            {/* Version A Dropdown */}
            <CompareVersionDropdown
              label="A"
              variant="lime"
              selectedMedia={mediaA}
              versions={versions}
              onSelect={handleSelectA}
            />

            {/* Swap Version A and B Button */}
            <button
              type="button"
              onClick={handleSwapVersions}
              className="grid size-8 place-items-center rounded-lg border border-line bg-surface text-muted transition hover:border-ink hover:text-ink hover:bg-paper shadow-2xs active:scale-95 cursor-pointer shrink-0"
              title="Swap Version A and B"
              aria-label="Swap Version A and B"
            >
              <ArrowLeftRight size={13} />
            </button>

            {/* Version B Dropdown */}
            <CompareVersionDropdown
              label="B"
              variant="surface"
              selectedMedia={mediaB}
              versions={versions}
              onSelect={handleSelectB}
            />
          </div>
        </header>
      )}

      {/* Main Comparison Viewport (Existing Components) */}
      <div className="relative flex-1 min-h-0 w-full h-full bg-black flex items-center justify-center overflow-hidden">
        {isImage ? (
          <ImageCompareViewport
            mode={mode}
            mediaA={mediaA}
            mediaB={mediaB}
            srcA={srcA}
            srcB={srcB}
            wipePosition={wipePosition}
            onWipePositionChange={setWipePosition}
            zoom={zoom}
            onZoomChange={setZoom}
            panOffset={panOffset}
            onPanOffsetChange={setPanOffset}
            rotation={rotation}
          />
        ) : (
          <VersionCompareViewport
            mode={mode}
            mediaA={mediaA}
            mediaB={mediaB}
            srcA={srcA}
            srcB={srcB}
            videoARef={videoARef}
            videoBRef={videoBRef}
            wipePosition={wipePosition}
            onWipePositionChange={setWipePosition}
          />
        )}
      </div>

      {/* Bottom Controls Bar for Image & Video Comparison */}
      <CompareFooter
        isImage={isImage}
        mode={mode}
        onModeChange={setMode}
        wipePosition={wipePosition}
        onWipePositionChange={setWipePosition}
        mediaA={mediaA}
        mediaB={mediaB}
        isPlaying={isPlaying}
        currentTime={currentTime}
        totalDuration={totalDuration}
        fps={fps}
        playbackRate={playbackRate}
        audioRouting={audioRouting}
        onTogglePlay={togglePlay}
        onStepFrame={stepFrame}
        onSeek={seek}
        onPlaybackRateChange={setPlaybackRate}
        onAudioRoutingChange={setAudioRouting}
        zoom={zoom}
        onZoomChange={setZoom}
        onResetZoom={handleResetZoom}
        rotation={rotation}
        onRotate={handleRotate}
        onResetView={handleResetView}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
      />
    </div>
  );
}
