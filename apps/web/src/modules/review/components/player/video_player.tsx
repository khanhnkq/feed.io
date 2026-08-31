"use client";

import type { CommentResponse, MediaResponse } from "@feedio/api-client";
import Hls from "hls.js";
import React, { useCallback, useEffect, useRef, useState } from "react";
import type { AnnotationShape, AnnotationTool } from "../../lib/annotation_serializer";
import { CanvasAnnotationLayer } from "./canvas_annotation_layer";
import { PlaybackControls } from "./playback_controls";
import { TimelineScrubber } from "./timeline_scrubber";

interface VideoPlayerProps {
  media: MediaResponse;
  comments: CommentResponse[];
  activeComment: CommentResponse | null;
  onSelectComment: (comment: CommentResponse | null) => void;
  currentTime?: number;
  onTimeUpdate?: (time: number) => void;
  shapes: AnnotationShape[];
  onShapesChange: (shapes: AnnotationShape[]) => void;
}

export function VideoPlayer({
  media,
  comments,
  activeComment,
  onSelectComment,
  currentTime: externalCurrentTime,
  onTimeUpdate,
  shapes,
  onShapesChange,
}: VideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(externalCurrentTime || 0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [inPoint, setInPoint] = useState<number | null>(null);
  const [outPoint, setOutPoint] = useState<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Annotation drawing state
  const [activeTool, setActiveTool] = useState<AnnotationTool>("select");
  const [activeColor, setActiveColor] = useState("#D8FF43");
  const [strokeWidth, setStrokeWidth] = useState(3);

  const fps = media.fps || 24;
  const isImage = media.mime_type.startsWith("image/");
  const displayDuration = (videoDuration > 0 ? videoDuration : media.duration_seconds) || 0;

  // Stream URL selection: Prefer direct MP4 stream / proxy for seamless native playback & range scrubbing
  const videoSrc = media.proxy_url || media.stream_url || media.hls_stream_url;

  // Initialize HLS.js or native video
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoSrc || isImage) return;

    let hls: Hls | null = null;

    // Use HLS only when direct MP4 is not available and HLS stream is present
    if (!media.stream_url && !media.proxy_url && media.hls_stream_url && Hls.isSupported()) {
      hls = new Hls({ enableWorker: true });
      hls.loadSource(media.hls_stream_url);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          const fallback = media.proxy_url || media.stream_url;
          if (fallback) {
            video.src = fallback;
            video.load();
          }
        }
      });
    } else {
      video.src = videoSrc;
      video.load();
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [videoSrc, media.hls_stream_url, media.proxy_url, media.stream_url, isImage]);

  // Sync external currentTime prop when provided
  useEffect(() => {
    if (
      externalCurrentTime !== undefined &&
      videoRef.current &&
      Math.abs(videoRef.current.currentTime - externalCurrentTime) > 0.05
    ) {
      videoRef.current.currentTime = externalCurrentTime;
      setCurrentTime(externalCurrentTime);
    }
  }, [externalCurrentTime]);

  // Video event handlers
  const lastDispatchedTimeRef = useRef(0);
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const time = videoRef.current.currentTime;
    setCurrentTime(time);

    const now = performance.now();
    if (now - lastDispatchedTimeRef.current > 120) {
      lastDispatchedTimeRef.current = now;
      onTimeUpdate?.(time);
    }

    // Handle loop range
    if (isLooping && inPoint !== null && outPoint !== null && outPoint > inPoint) {
      if (time >= outPoint || time < inPoint) {
        videoRef.current.currentTime = inPoint;
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    if (videoRef.current.duration && !Number.isNaN(videoRef.current.duration)) {
      setVideoDuration(videoRef.current.duration);
    }
  };

  // Playback control actions
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      const p = videoRef.current.play();
      if (p !== undefined) {
        p.then(() => {
          setIsPlaying(true);
          setActiveTool("select");
        }).catch(() => {
          setIsPlaying(false);
        });
      }
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
      onTimeUpdate?.(videoRef.current.currentTime);
    }
  }, [onTimeUpdate]);

  const seekTo = useCallback(
    (seconds: number) => {
      if (!videoRef.current) {
        setCurrentTime(seconds);
        onTimeUpdate?.(seconds);
        return;
      }
      const safeTime = Math.max(0, Math.min(displayDuration, seconds));
      videoRef.current.currentTime = safeTime;
      setCurrentTime(safeTime);
      onTimeUpdate?.(safeTime);
    },
    [displayDuration, onTimeUpdate],
  );

  const stepFrame = useCallback((frames: number) => {
    if (!videoRef.current) return;
    videoRef.current.pause();
    setIsPlaying(false);
    const frameDuration = 1 / fps;
    const target = videoRef.current.currentTime + frames * frameDuration;
    seekTo(target);
  }, [fps, seekTo]);

  const jumpSeconds = useCallback((secs: number) => {
    if (!videoRef.current) return;
    seekTo(videoRef.current.currentTime + secs);
  }, [seekTo]);

  const changePlaybackRate = useCallback((rate: number) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = rate;
    setPlaybackRate(rate);
  }, []);

  const changeVolume = useCallback((vol: number) => {
    if (!videoRef.current) return;
    videoRef.current.volume = vol;
    videoRef.current.muted = vol === 0;
    setVolume(vol);
    setIsMuted(vol === 0);
  }, []);

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  }, [isMuted]);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  // Keyboard hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (
        activeEl?.tagName === "INPUT" ||
        activeEl?.tagName === "TEXTAREA" ||
        (activeEl as HTMLElement)?.isContentEditable
      ) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case " ":
        case "k":
          e.preventDefault();
          togglePlay();
          break;
        case "j":
          e.preventDefault();
          jumpSeconds(-5);
          break;
        case "l":
          e.preventDefault();
          jumpSeconds(5);
          break;
        case ",":
          e.preventDefault();
          stepFrame(-1);
          break;
        case ".":
          e.preventDefault();
          stepFrame(1);
          break;
        case "i":
          e.preventDefault();
          setInPoint(currentTime);
          break;
        case "o":
          e.preventDefault();
          setOutPoint(currentTime);
          break;
        case "f":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "m":
          e.preventDefault();
          toggleMute();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlay, jumpSeconds, stepFrame, currentTime, toggleFullscreen, toggleMute]);

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col h-full w-full bg-paper select-none"
    >
      {/* Video Viewport Container */}
      <div className="relative flex-1 min-h-0 flex items-center justify-center bg-[#0D0E0C] overflow-hidden">
        {!isImage ? (
          <video
            ref={videoRef}
            src={videoSrc || undefined}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
            onClick={() => {
              if (activeTool === "select") {
                togglePlay();
              }
            }}
            playsInline
            preload="auto"
            crossOrigin="anonymous"
            className="max-h-full max-w-full object-contain cursor-pointer"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={media.stream_url || media.thumbnail_url || ""}
            alt={media.title}
            className="max-h-full max-w-full object-contain pointer-events-none select-none"
          />
        )}

        {/* Vector Annotation Drawing Layer */}
        <CanvasAnnotationLayer
          shapes={shapes}
          onShapesChange={onShapesChange}
          activeTool={activeTool}
          onToolChange={setActiveTool}
          activeColor={activeColor}
          onColorChange={setActiveColor}
          strokeWidth={strokeWidth}
          onStrokeWidthChange={setStrokeWidth}
          readonlyShapes={
            activeComment?.annotation_data
              ? (activeComment.annotation_data as { shapes?: AnnotationShape[] }).shapes
              : null
          }
          isPaused={!isPlaying}
        />
      </div>

      {/* Player Bottom Control Deck */}
      <div className="border-t border-line bg-paper px-4 py-2.5">
        {/* Timeline Scrubber */}
        <TimelineScrubber
          currentTime={currentTime}
          duration={displayDuration}
          fps={fps}
          onSeek={seekTo}
          waveformData={media.waveform_data}
          comments={comments}
          onSelectComment={onSelectComment}
          activeCommentId={activeComment?.id}
          inPoint={inPoint}
          outPoint={outPoint}
          filmstripUrl={media.filmstrip_url}
          videoSrc={videoSrc}
        />

        {/* Playback Controls Deck */}
        <PlaybackControls
          isPlaying={isPlaying}
          onTogglePlay={togglePlay}
          onStepFrame={stepFrame}
          onJumpSeconds={jumpSeconds}
          currentTime={currentTime}
          duration={displayDuration}
          fps={fps}
          playbackRate={playbackRate}
          onChangePlaybackRate={changePlaybackRate}
          isLooping={isLooping}
          onToggleLoop={() => setIsLooping(!isLooping)}
          volume={volume}
          isMuted={isMuted}
          onChangeVolume={changeVolume}
          onToggleMute={toggleMute}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
        />
      </div>
    </div>
  );
}
