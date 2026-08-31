"use client";

import type { MediaResponse } from "@feedio/api-client";
import { useGetMedia } from "@feedio/api-client";
import {
  AlertTriangle,
  Download,
  FileVideo,
  Film,
  ImageIcon,
  Info,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/modules/ui";
import { formatBytes, formatDuration, formatResolutionBadge } from "../lib/media_formatters";

export interface MediaViewerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  projectId: string;
  mediaId: string | null;
}

export function MediaViewerModal({
  open,
  onOpenChange,
  organizationId,
  projectId,
  mediaId,
}: MediaViewerModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showMetadata, setShowMetadata] = useState(false);

  const { data: media, isLoading } = useGetMedia(
    organizationId,
    projectId,
    mediaId || "",
    {
      query: {
        enabled: open && Boolean(mediaId),
        refetchInterval: (query) => {
          const currentMedia = query.state.data as MediaResponse | undefined;
          return currentMedia?.status === "processing" ? 3000 : false;
        },
      },
    },
  );

  const streamUrl = media?.stream_url;
  const isProcessing = media?.status === "processing";
  const isFailed = media?.status === "failed";

  const waveformPeaks = useMemo(() => {
    if (!media?.id) return [];
    let hash = 0;
    for (let i = 0; i < media.id.length; i++) {
      hash = (hash << 5) - hash + media.id.charCodeAt(i);
      hash |= 0;
    }
    const count = 64;
    const peaks: number[] = [];
    for (let i = 0; i < count; i++) {
      const pseudo = Math.abs(Math.sin((hash + i * 17) / 10));
      peaks.push(Math.max(0.15, pseudo));
    }
    return peaks;
  }, [media?.id]);

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      void videoRef.current.play();
    }
  }, [isPlaying]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      void containerRef.current.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      void document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.code === "Space" && e.target === document.body) {
        e.preventDefault();
        togglePlay();
      } else if (e.code === "ArrowLeft") {
        if (videoRef.current) {
          videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
        }
      } else if (e.code === "ArrowRight") {
        if (videoRef.current) {
          videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 5);
        }
      } else if (e.code === "KeyF") {
        toggleFullscreen();
      } else if (e.code === "Escape") {
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, duration, onOpenChange, togglePlay]);

  if (!open || !mediaId) return null;

  const isImage = Boolean(media?.mime_type?.startsWith("image/"));
  const isSvg = Boolean(media?.mime_type === "image/svg+xml" || media?.filename?.endsWith(".svg"));
  const resolutionBadge = isSvg ? "Vector SVG" : formatResolutionBadge(media?.width, media?.height);
  const progressRatio = duration > 0 ? currentTime / duration : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/75 p-4 backdrop-blur-xs">
      <div
        ref={containerRef}
        className="relative flex max-h-[95vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-2xl"
      >
        {/* Top bar */}
        <div className="flex items-center justify-between border-b border-line bg-surface px-4 py-3">
          <div className="flex items-center gap-3 min-w-0 flex-1 mr-4">
            <div className="grid size-8 shrink-0 place-items-center rounded-lg border border-line bg-paper text-ink">
              {isImage ? <ImageIcon size={16} /> : <FileVideo size={16} />}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-sm font-bold text-ink leading-tight" title={media?.title}>
                {media?.title || (isImage ? "Asset Preview" : "Media Preview")}
              </h2>
              <div className="flex items-center gap-2 text-[11px] text-muted font-mono truncate mt-0.5">
                {media?.file_size_bytes && <span>{formatBytes(media.file_size_bytes)}</span>}
                {resolutionBadge && (
                  <>
                    <span>•</span>
                    <span className="rounded border border-line bg-paper px-1.5 py-0.2 font-semibold text-ink shrink-0">
                      {resolutionBadge}
                    </span>
                  </>
                )}
                {media?.fps && (
                  <>
                    <span>•</span>
                    <span className="rounded border border-line bg-paper px-1.5 py-0.2 font-semibold text-ink shrink-0">
                      {media.fps} FPS
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowMetadata(!showMetadata)}
              className={showMetadata ? "bg-paper border-ink" : ""}
            >
              <Info size={15} />
            </Button>
            {streamUrl && (
              <a href={streamUrl} download={media?.filename || "asset"} target="_blank" rel="noreferrer">
                <Button variant="outline" size="sm">
                  <Download size={14} className="mr-1.5" />
                  Download
                </Button>
              </a>
            )}
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="grid size-8 place-items-center rounded-lg border border-line bg-paper text-muted hover:border-ink hover:text-ink transition"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Player / Viewer content */}
        <div className="relative flex flex-1 flex-col items-center justify-center bg-black min-h-[340px]">
          {/* Non-blocking background transcoding notification in corner */}
          {isProcessing && (
            <div className="absolute top-3 right-3 z-20 flex flex-col gap-1 rounded-lg border border-line bg-surface/95 px-3 py-1.5 text-xs font-medium text-ink shadow-lg backdrop-blur-md">
              <div className="flex items-center gap-1.5">
                <Film className="size-3 text-ink" />
                <span className="font-mono text-[11px] font-bold text-ink">Background Transcoding</span>
              </div>
              <div className="h-1 w-32 bg-paper rounded-full overflow-hidden border border-line">
                <div className="h-full w-1/2 bg-lime rounded-full" />
              </div>
            </div>
          )}

          {isFailed && (
            <div className="absolute top-3 right-3 z-20 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50/95 px-3 py-1.5 text-xs font-medium text-red-700 shadow-lg backdrop-blur-md">
              <AlertTriangle className="size-3.5 text-red-600" />
              <span className="font-mono text-[11px] font-bold text-red-700">Transcode Failed • Playing source</span>
            </div>
          )}

          {isLoading ? (
            <div className="flex h-96 flex-col items-center justify-center gap-2 text-white/80">
              <div className="h-1 w-24 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full w-1/2 bg-lime rounded-full" />
              </div>
              <p className="text-xs font-mono">Loading media stream...</p>
            </div>
          ) : isImage ? (
            <div className="flex flex-1 items-center justify-center p-6 w-full max-h-[70vh] bg-[#11130f]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={streamUrl || media?.thumbnail_url || ""}
                alt={media?.title || "Asset preview"}
                className={`max-h-[65vh] max-w-full rounded shadow-xl ${
                  isSvg ? "object-contain p-4 bg-[#1b1e18]" : "object-contain"
                }`}
              />
            </div>
          ) : streamUrl ? (
            <video
              ref={videoRef}
              src={streamUrl}
              className="max-h-[60vh] w-full object-contain"
              playsInline
              onTimeUpdate={() => {
                if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
              }}
              onLoadedMetadata={() => {
                if (videoRef.current) setDuration(videoRef.current.duration);
              }}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
              onClick={togglePlay}
            />
          ) : (
            <div className="flex h-96 flex-col items-center justify-center gap-2 text-white/80">
              <AlertTriangle className="size-8 text-amber-400" />
              <p className="text-xs font-mono text-white/80">Media stream unavailable</p>
            </div>
          )}

          {/* Custom Player Controls & Waveform Bar (Video only) */}
          {!isImage && streamUrl && (
            <div className="w-full bg-ink px-4 py-2.5 text-white">
              {/* Interactive Audio Waveform Timeline */}
              {waveformPeaks.length > 0 && (
                <div className="relative mb-2 flex h-8 w-full items-end gap-[2px] overflow-hidden rounded bg-white/5 px-1 py-1">
                  {waveformPeaks.map((peak, idx) => {
                    const barProgress = idx / waveformPeaks.length;
                    const isPassed = barProgress <= progressRatio;
                    return (
                      <div
                        key={idx}
                        style={{ height: `${Math.max(15, peak * 100)}%` }}
                        className={`flex-1 rounded-xs transition-colors duration-75 ${
                          isPassed ? "bg-lime shadow-[0_0_6px_#d8ff43]" : "bg-white/20"
                        }`}
                      />
                    );
                  })}
                </div>
              )}

              {/* Scrubber slider */}
              <div className="group relative flex items-center py-1">
                <input
                  type="range"
                  min={0}
                  max={duration || 100}
                  value={currentTime}
                  onChange={(e) => {
                    const time = parseFloat(e.target.value);
                    setCurrentTime(time);
                    if (videoRef.current) videoRef.current.currentTime = time;
                  }}
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-white/20 accent-lime group-hover:h-2"
                />
              </div>

              {/* Controls Toolbar */}
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="grid size-8 place-items-center rounded-lg text-white/80 transition hover:bg-white/15 hover:text-white"
                  >
                    {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (videoRef.current) videoRef.current.currentTime = 0;
                    }}
                    className="grid size-8 place-items-center rounded-lg text-white/80 transition hover:bg-white/15 hover:text-white"
                  >
                    <RotateCcw size={15} />
                  </button>

                  <span className="font-mono text-xs text-white/80 ml-2">
                    {formatDuration(currentTime)} / {formatDuration(duration)}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {/* Volume Slider */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (videoRef.current) {
                          const nextMute = !isMuted;
                          videoRef.current.muted = nextMute;
                          setIsMuted(nextMute);
                        }
                      }}
                      className="grid size-8 place-items-center rounded-lg text-white/80 transition hover:bg-white/15 hover:text-white"
                    >
                      {isMuted || volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={isMuted ? 0 : volume}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setVolume(val);
                        setIsMuted(false);
                        if (videoRef.current) {
                          videoRef.current.volume = val;
                          videoRef.current.muted = false;
                        }
                      }}
                      className="h-1 w-20 cursor-pointer appearance-none rounded-lg bg-white/20 accent-lime"
                    />
                  </div>

                  {/* Fullscreen Button */}
                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    className="grid size-8 place-items-center rounded-lg text-white/80 transition hover:bg-white/15 hover:text-white"
                  >
                    {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Metadata Drawer */}
        {showMetadata && media && (
          <div className="border-t border-line bg-surface p-4 text-xs">
            <h4 className="font-bold text-ink mb-2 uppercase tracking-wider font-mono">Asset Technical Details</h4>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-5 font-mono text-muted">
              <div>
                <span className="block text-[10px] uppercase text-muted">Format</span>
                <span className="font-bold text-ink">{media.mime_type}</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase text-muted">Dimensions</span>
                <span className="font-bold text-ink">
                  {media.width && media.height ? `${media.width}x${media.height}` : "Auto"}
                </span>
              </div>
              <div>
                <span className="block text-[10px] uppercase text-muted">FPS</span>
                <span className="font-bold text-ink">{media.fps ? `${media.fps} fps` : "—"}</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase text-muted">File Size</span>
                <span className="font-bold text-ink">{formatBytes(media.file_size_bytes)}</span>
              </div>
              <div>
                <span className="block text-[10px] uppercase text-muted">Status</span>
                <span className="font-bold text-ink">
                  {isProcessing ? "Processing Proxies" : media.hls_storage_key ? "HLS Master Ready" : "Ready"}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export type VideoPlayerModalProps = MediaViewerModalProps;
export const VideoPlayerModal = MediaViewerModal;
