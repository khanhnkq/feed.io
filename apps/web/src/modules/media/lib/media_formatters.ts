/**
 * Format byte count into human-readable string (KB, MB, GB).
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes <= 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Format duration in seconds into MM:SS or HH:MM:SS format.
 */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || isNaN(seconds) || seconds < 0) return "--:--";
  const totalSeconds = Math.floor(seconds);
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Format video resolution badge (e.g. 4K, 1080p, 720p).
 */
export function formatResolutionBadge(width?: number | null, height?: number | null): string | null {
  if (!width || !height) return null;
  if (width >= 3840 || height >= 2160) return "4K UHD";
  if (width >= 2560 || height >= 1440) return "2K QHD";
  if (width >= 1920 || height >= 1080) return "1080p FHD";
  if (width >= 1280 || height >= 720) return "720p HD";
  return `${height}p`;
}
