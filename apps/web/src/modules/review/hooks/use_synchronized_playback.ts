"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type CompareMode = "side_by_side" | "wipe" | "difference";
export type AudioRouting = "A" | "B" | "none";

export function calculateSynchronizedTargetTime(
  timeA: number,
  frameOffset: number,
  fps: number,
): number {
  return Math.max(0, timeA + frameOffset / fps);
}

export function calculateDrift(timeB: number, targetB: number): number {
  return Math.abs(timeB - targetB);
}

export function isDriftCorrectionNeeded(drift: number, fps: number): boolean {
  return drift > 1 / fps;
}

export function calculateClampedSeek(
  targetTime: number,
  totalDuration: number,
): number {
  return Math.max(0, Math.min(targetTime, totalDuration || 1000));
}

export function calculateStepTime(
  currentTime: number,
  deltaFrames: number,
  fps: number,
  totalDuration: number,
): number {
  const stepSeconds = deltaFrames / fps;
  return calculateClampedSeek(currentTime + stepSeconds, totalDuration);
}

interface UseSynchronizedPlaybackOptions {
  fps?: number;
  durationA?: number;
  durationB?: number;
}

export function useSynchronizedPlayback({
  fps = 24,
  durationA = 0,
  durationB = 0,
}: UseSynchronizedPlaybackOptions = {}) {
  const videoARef = useRef<HTMLVideoElement | null>(null);
  const videoBRef = useRef<HTMLVideoElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [mode, setMode] = useState<CompareMode>("side_by_side");
  const [wipePosition, setWipePosition] = useState(50); // percentage 0 - 100
  const [audioRouting, setAudioRouting] = useState<AudioRouting>("A");
  const [frameOffset, setFrameOffset] = useState(0); // Offset in frames for B relative to A
  const [syncDrift, setSyncDrift] = useState(0);

  const totalDuration = Math.max(durationA, durationB);

  // Sync audio states on video elements
  useEffect(() => {
    const vidA = videoARef.current;
    const vidB = videoBRef.current;
    if (!vidA || !vidB) return;

    if (audioRouting === "A") {
      vidA.muted = false;
      vidB.muted = true;
    } else if (audioRouting === "B") {
      vidA.muted = true;
      vidB.muted = false;
    } else {
      vidA.muted = true;
      vidB.muted = true;
    }
  }, [audioRouting]);

  // Master synchronization loop driven by requestAnimationFrame
  useEffect(() => {
    let animId: number;

    const syncLoop = () => {
      const vidA = videoARef.current;
      const vidB = videoBRef.current;

      if (vidA && vidB) {
        const timeA = vidA.currentTime;
        setCurrentTime(timeA);

        const targetB = calculateSynchronizedTargetTime(timeA, frameOffset, fps);
        const drift = calculateDrift(vidB.currentTime, targetB);
        setSyncDrift(drift);

        // Correct drift if greater than 1 frame (~0.04s)
        if (isDriftCorrectionNeeded(drift, fps)) {
          vidB.currentTime = targetB;
        }

        // Align play/pause state
        if (!vidA.paused && vidB.paused) {
          vidB.play().catch(() => {});
        } else if (vidA.paused && !vidB.paused) {
          vidB.pause();
        }

        // Align playback rate
        if (vidB.playbackRate !== vidA.playbackRate) {
          vidB.playbackRate = vidA.playbackRate;
        }
      }

      animId = requestAnimationFrame(syncLoop);
    };

    animId = requestAnimationFrame(syncLoop);
    return () => cancelAnimationFrame(animId);
  }, [frameOffset, fps]);

  const togglePlay = useCallback(() => {
    const vidA = videoARef.current;
    const vidB = videoBRef.current;
    if (!vidA) return;

    if (vidA.paused) {
      vidA.play().then(() => {
        setIsPlaying(true);
        if (vidB) {
          vidB.currentTime = calculateSynchronizedTargetTime(vidA.currentTime, frameOffset, fps);
          vidB.play().catch(() => {});
        }
      }).catch(() => {});
    } else {
      vidA.pause();
      vidB?.pause();
      setIsPlaying(false);
    }
  }, [frameOffset, fps]);

  const seek = useCallback((targetTime: number) => {
    const clamped = calculateClampedSeek(targetTime, totalDuration);
    const vidA = videoARef.current;
    const vidB = videoBRef.current;

    if (vidA) {
      vidA.currentTime = clamped;
    }
    if (vidB) {
      vidB.currentTime = calculateSynchronizedTargetTime(clamped, frameOffset, fps);
    }
    setCurrentTime(clamped);
  }, [frameOffset, fps, totalDuration]);

  const stepFrame = useCallback((deltaFrames: number) => {
    const vidA = videoARef.current;
    if (!vidA) return;

    vidA.pause();
    videoBRef.current?.pause();
    setIsPlaying(false);

    seek(calculateStepTime(vidA.currentTime, deltaFrames, fps, totalDuration));
  }, [fps, seek, totalDuration]);

  const handleSetPlaybackRate = useCallback((rate: number) => {
    setPlaybackRate(rate);
    if (videoARef.current) videoARef.current.playbackRate = rate;
    if (videoBRef.current) videoBRef.current.playbackRate = rate;
  }, []);

  return {
    videoARef,
    videoBRef,
    isPlaying,
    currentTime,
    totalDuration,
    playbackRate,
    mode,
    wipePosition,
    audioRouting,
    frameOffset,
    syncDrift,
    setMode,
    setWipePosition,
    setAudioRouting,
    setFrameOffset,
    setPlaybackRate: handleSetPlaybackRate,
    togglePlay,
    seek,
    stepFrame,
  };
}
