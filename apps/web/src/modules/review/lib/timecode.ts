/**
 * SMPTE Timecode utilities for frame-accurate video review.
 */

export function secondsToFrame(seconds: number, fps = 24): number {
  if (seconds < 0 || isNaN(seconds)) return 0;
  return Math.floor(seconds * fps);
}

export function frameToSeconds(frame: number, fps = 24): number {
  if (frame < 0 || isNaN(frame) || fps <= 0) return 0;
  return frame / fps;
}

export function formatSMPTETimecode(seconds: number, fps = 24): string {
  if (isNaN(seconds) || seconds < 0) {
    return "00:00:00:00";
  }

  const effectiveFps = fps > 0 ? fps : 24;
  const totalFrames = Math.floor(seconds * effectiveFps);

  const frames = totalFrames % Math.round(effectiveFps);
  const totalSeconds = Math.floor(seconds);

  const secs = totalSeconds % 60;
  const mins = Math.floor(totalSeconds / 60) % 60;
  const hours = Math.floor(totalSeconds / 3600);

  const pad = (n: number, len = 2) => String(n).padStart(len, "0");

  return `${pad(hours)}:${pad(mins)}:${pad(secs)}:${pad(frames)}`;
}

export function parseSMPTETimecode(timecode: string, fps = 24): number {
  const parts = timecode.split(":").map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some(isNaN)) {
    return 0;
  }
  const [hours, mins, secs, frames] = parts;
  const effectiveFps = fps > 0 ? fps : 24;
  return hours * 3600 + mins * 60 + secs + frames / effectiveFps;
}
