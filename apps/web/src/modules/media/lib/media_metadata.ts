export interface ExtractedMediaMetadata {
  durationSeconds: number;
  width: number;
  height: number;
  thumbnailBlob: Blob | null;
  thumbnailDataUrl: string | null;
}

export type ExtractedVideoMetadata = ExtractedMediaMetadata;

export function isImageFile(file: File): boolean {
  if (file.type && file.type.startsWith("image/")) {
    return true;
  }
  return Boolean(
    file.name.match(/\.(png|jpg|jpeg|webp|svg|gif|avif|bmp|ico|tiff|tif|heic|heif)$/i),
  );
}

export function isVideoFile(file: File): boolean {
  if (file.type && file.type.startsWith("video/")) {
    return true;
  }
  return Boolean(file.name.match(/\.(mp4|mov|webm|mkv|avi|mpeg|mpg|ogg|m4v)$/i));
}

export async function extractImageMetadataAndThumbnail(
  file: File,
): Promise<ExtractedMediaMetadata> {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.URL || !window.document) {
      resolve({
        durationSeconds: 0,
        width: 0,
        height: 0,
        thumbnailBlob: null,
        thumbnailDataUrl: null,
      });
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    let isCleanedUp = false;
    const cleanup = () => {
      if (isCleanedUp) return;
      isCleanedUp = true;
    };

    const timer = setTimeout(() => {
      cleanup();
      URL.revokeObjectURL(objectUrl);
      resolve({
        durationSeconds: 0,
        width: 0,
        height: 0,
        thumbnailBlob: null,
        thumbnailDataUrl: null,
      });
    }, 8000);

    img.onload = () => {
      clearTimeout(timer);
      try {
        const width = img.naturalWidth || 0;
        const height = img.naturalHeight || 0;

        // For SVG or small images, use direct object URL
        if (file.type === "image/svg+xml" || file.name.endsWith(".svg")) {
          cleanup();
          resolve({
            durationSeconds: 0,
            width: width || 800,
            height: height || 600,
            thumbnailBlob: file,
            thumbnailDataUrl: objectUrl,
          });
          return;
        }

        const canvas = document.createElement("canvas");
        const maxDim = 640;
        let targetWidth = width || 640;
        let targetHeight = height || 480;

        if (targetWidth > maxDim) {
          targetHeight = Math.round((targetHeight * maxDim) / targetWidth);
          targetWidth = maxDim;
        }

        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext("2d");

        if (ctx && width > 0 && height > 0) {
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
          canvas.toBlob(
            (blob) => {
              cleanup();
              URL.revokeObjectURL(objectUrl);
              resolve({
                durationSeconds: 0,
                width,
                height,
                thumbnailBlob: blob || file,
                thumbnailDataUrl: dataUrl,
              });
            },
            "image/jpeg",
            0.85,
          );
        } else {
          cleanup();
          URL.revokeObjectURL(objectUrl);
          resolve({
            durationSeconds: 0,
            width,
            height,
            thumbnailBlob: file,
            thumbnailDataUrl: objectUrl,
          });
        }
      } catch {
        cleanup();
        URL.revokeObjectURL(objectUrl);
        resolve({
          durationSeconds: 0,
          width: 0,
          height: 0,
          thumbnailBlob: file,
          thumbnailDataUrl: objectUrl,
        });
      }
    };

    img.onerror = () => {
      clearTimeout(timer);
      cleanup();
      URL.revokeObjectURL(objectUrl);
      resolve({
        durationSeconds: 0,
        width: 0,
        height: 0,
        thumbnailBlob: null,
        thumbnailDataUrl: null,
      });
    };

    img.src = objectUrl;
  });
}

export async function extractMediaMetadataAndThumbnail(
  file: File,
): Promise<ExtractedMediaMetadata> {
  if (isImageFile(file)) {
    return extractImageMetadataAndThumbnail(file);
  }

  return new Promise((resolve) => {
    // Fallback if running in SSR or unsupported environment
    if (typeof window === "undefined" || !window.URL || !window.document) {
      resolve({
        durationSeconds: 0,
        width: 0,
        height: 0,
        thumbnailBlob: null,
        thumbnailDataUrl: null,
      });
      return;
    }

    const video = document.createElement("video");
    const objectUrl = URL.createObjectURL(file);

    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.src = objectUrl;

    let isCleanedUp = false;
    const cleanup = () => {
      if (isCleanedUp) return;
      isCleanedUp = true;
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(objectUrl);
    };

    // Safety timeout: 8 seconds maximum
    const timer = setTimeout(() => {
      cleanup();
      resolve({
        durationSeconds: 0,
        width: 0,
        height: 0,
        thumbnailBlob: null,
        thumbnailDataUrl: null,
      });
    }, 8000);

    video.onloadedmetadata = () => {
      const durationSeconds = video.duration || 0;
      // Seek to 1s or middle of video for representative frame
      const seekTime = Math.min(1.0, durationSeconds > 0 ? durationSeconds / 2 : 0);
      video.currentTime = seekTime;
    };

    video.onseeked = () => {
      try {
        const durationSeconds = video.duration || 0;
        const width = video.videoWidth || 0;
        const height = video.videoHeight || 0;

        const canvas = document.createElement("canvas");
        const maxDim = 640;
        let targetWidth = width || 640;
        let targetHeight = height || 360;

        if (targetWidth > maxDim) {
          targetHeight = Math.round((targetHeight * maxDim) / targetWidth);
          targetWidth = maxDim;
        }

        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext("2d");

        if (ctx && width > 0 && height > 0) {
          ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.85);

          canvas.toBlob(
            (blob) => {
              clearTimeout(timer);
              cleanup();
              resolve({
                durationSeconds,
                width,
                height,
                thumbnailBlob: blob,
                thumbnailDataUrl: dataUrl,
              });
            },
            "image/jpeg",
            0.85,
          );
        } else {
          clearTimeout(timer);
          cleanup();
          resolve({
            durationSeconds,
            width,
            height,
            thumbnailBlob: null,
            thumbnailDataUrl: null,
          });
        }
      } catch {
        clearTimeout(timer);
        cleanup();
        resolve({
          durationSeconds: video.duration || 0,
          width: video.videoWidth || 0,
          height: video.videoHeight || 0,
          thumbnailBlob: null,
          thumbnailDataUrl: null,
        });
      }
    };

    video.onerror = () => {
      clearTimeout(timer);
      cleanup();
      resolve({
        durationSeconds: 0,
        width: 0,
        height: 0,
        thumbnailBlob: null,
        thumbnailDataUrl: null,
      });
    };
  });
}

export const extractVideoMetadataAndThumbnail = extractMediaMetadataAndThumbnail;
