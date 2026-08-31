import type {
  CompleteMultipartUploadRequest,
  InitiateMultipartUploadRequest,
  InitiateMultipartUploadResponse,
  MediaResponse,
  MultipartPartETag,
  PresignMultipartPartsRequest,
  PresignMultipartPartsResponse,
} from "@feedio/api-client";

export const DEFAULT_PART_SIZE = 20 * 1024 * 1024; // 20 MB
export const MULTIPART_THRESHOLD = 50 * 1024 * 1024; // 50 MB

export interface MultipartUploadProgress {
  totalBytes: number;
  loadedBytes: number;
  percent: number;
  speedBytesPerSec: number;
  etaSeconds: number | null;
  completedParts: number;
  totalParts: number;
  activeParts: number;
}

export interface MultipartCacheData {
  mediaId: string;
  uploadId: string;
  partSizeBytes: number;
  totalParts: number;
  completedParts: MultipartPartETag[];
  timestamp: number;
}

export interface MultipartUploaderApi {
  initiate: (params: {
    organizationId: string;
    projectId: string;
    data: InitiateMultipartUploadRequest;
  }) => Promise<InitiateMultipartUploadResponse>;
  presignParts: (params: {
    organizationId: string;
    projectId: string;
    mediaId: string;
    data: PresignMultipartPartsRequest;
  }) => Promise<PresignMultipartPartsResponse>;
  complete: (params: {
    organizationId: string;
    projectId: string;
    mediaId: string;
    data: CompleteMultipartUploadRequest;
  }) => Promise<MediaResponse>;
  abort: (params: {
    organizationId: string;
    projectId: string;
    mediaId: string;
    data: { upload_id: string };
  }) => Promise<unknown>;
}

export type MultipartUploaderStatus =
  | "initiating"
  | "uploading"
  | "paused"
  | "completing"
  | "aborted"
  | "error";

export interface MultipartUploaderOptions {
  concurrency?: number;
  partSizeBytes?: number;
  maxRetries?: number;
  onProgress?: (progress: MultipartUploadProgress) => void;
  onStatusChange?: (status: MultipartUploaderStatus) => void;
}

export function getMultipartCacheKey(
  organizationId: string,
  projectId: string,
  file: File,
): string {
  return `feedio_mp_${organizationId}_${projectId}_${file.name}_${file.size}_${file.lastModified}`;
}

export function getMultipartCache(
  organizationId: string,
  projectId: string,
  file: File,
): MultipartCacheData | null {
  if (typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(getMultipartCacheKey(organizationId, projectId, file));
    if (!raw) return null;
    const data: MultipartCacheData = JSON.parse(raw);
    // Expire cache after 24 hours
    if (Date.now() - data.timestamp > 24 * 60 * 60 * 1000) {
      clearMultipartCache(organizationId, projectId, file);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function saveMultipartCache(
  organizationId: string,
  projectId: string,
  file: File,
  data: MultipartCacheData,
): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(
      getMultipartCacheKey(organizationId, projectId, file),
      JSON.stringify(data),
    );
  } catch {
    // Non-blocking quota error
  }
}

export function clearMultipartCache(
  organizationId: string,
  projectId: string,
  file: File,
): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(getMultipartCacheKey(organizationId, projectId, file));
  } catch {
    // Ignore
  }
}

export class MultipartUploader {
  private activeXhrs = new Set<XMLHttpRequest>();
  private isAborted = false;
  private isPaused = false;

  constructor(
    private file: File,
    private organizationId: string,
    private projectId: string,
    private api: MultipartUploaderApi,
    private options: MultipartUploaderOptions = {},
  ) {}

  public async start(metadata?: {
    folderId?: string | null;
    durationSeconds?: number | null;
    width?: number | null;
    height?: number | null;
    thumbnailBlob?: Blob | null;
  }): Promise<MediaResponse> {
    const concurrency = this.options.concurrency ?? 3;
    const partSizeBytes = this.options.partSizeBytes ?? DEFAULT_PART_SIZE;
    const maxRetries = this.options.maxRetries ?? 3;

    this.options.onStatusChange?.("initiating");

    // 1. Check or initialize multipart session
    let cache = getMultipartCache(this.organizationId, this.projectId, this.file);
    let mediaId: string;
    let uploadId: string;
    let totalParts: number;
    const completedPartsMap = new Map<number, string>();

    if (cache && cache.partSizeBytes === partSizeBytes) {
      mediaId = cache.mediaId;
      uploadId = cache.uploadId;
      totalParts = cache.totalParts;
      for (const p of cache.completedParts) {
        completedPartsMap.set(p.part_number, p.etag);
      }
    } else {
      const initRes = await this.api.initiate({
        organizationId: this.organizationId,
        projectId: this.projectId,
        data: {
          filename: this.file.name,
          file_size_bytes: this.file.size,
          mime_type: this.file.type || "video/mp4",
          folder_id: metadata?.folderId || null,
          duration_seconds: metadata?.durationSeconds || null,
          width: metadata?.width || null,
          height: metadata?.height || null,
          has_thumbnail: Boolean(metadata?.thumbnailBlob),
          part_size_bytes: partSizeBytes,
        },
      });

      mediaId = initRes.media_id;
      uploadId = initRes.upload_id;
      totalParts = initRes.total_parts;

      // Upload thumbnail if URL provided
      if (initRes.thumbnail_upload_url && metadata?.thumbnailBlob) {
        try {
          await fetch(initRes.thumbnail_upload_url, {
            method: "PUT",
            headers: { "Content-Type": "image/jpeg" },
            body: metadata.thumbnailBlob,
          });
        } catch {
          // Non-blocking thumbnail upload
        }
      }

      cache = {
        mediaId,
        uploadId,
        partSizeBytes,
        totalParts,
        completedParts: [],
        timestamp: Date.now(),
      };
      saveMultipartCache(this.organizationId, this.projectId, this.file, cache);
    }

    if (this.isAborted) {
      throw new Error("Upload aborted");
    }

    this.options.onStatusChange?.("uploading");

    // 2. Prepare parts queue
    const pendingParts: number[] = [];
    for (let p = 1; p <= totalParts; p++) {
      if (!completedPartsMap.has(p)) {
        pendingParts.push(p);
      }
    }

    // Progress tracking state
    const partProgressMap = new Map<number, number>();
    for (let p = 1; p <= totalParts; p++) {
      if (completedPartsMap.has(p)) {
        const pSize = p === totalParts ? this.file.size - (p - 1) * partSizeBytes : partSizeBytes;
        partProgressMap.set(p, pSize);
      } else {
        partProgressMap.set(p, 0);
      }
    }

    let lastLoadedBytes = 0;
    let lastTime = Date.now();
    let speed = 0;

    const emitProgress = (activeCount: number) => {
      let totalLoaded = 0;
      for (const loaded of partProgressMap.values()) {
        totalLoaded += loaded;
      }

      const now = Date.now();
      const elapsed = (now - lastTime) / 1000;
      if (elapsed >= 0.5) {
        const bytesDiff = totalLoaded - lastLoadedBytes;
        speed = Math.max(0, bytesDiff / elapsed);
        lastLoadedBytes = totalLoaded;
        lastTime = now;
      }

      const remainingBytes = this.file.size - totalLoaded;
      const etaSeconds = speed > 0 ? Math.ceil(remainingBytes / speed) : null;
      const percent = Math.min(100, Math.round((totalLoaded / this.file.size) * 100));

      this.options.onProgress?.({
        totalBytes: this.file.size,
        loadedBytes: totalLoaded,
        percent,
        speedBytesPerSec: speed,
        etaSeconds,
        completedParts: completedPartsMap.size,
        totalParts,
        activeParts: activeCount,
      });
    };

    emitProgress(0);

    // 3. Worker Pool for Chunk Uploading
    let activeWorkers = 0;
    let nextIndex = 0;

    const uploadPartWithRetry = async (partNumber: number): Promise<void> => {
      let attempt = 0;
      while (attempt < maxRetries) {
        if (this.isAborted) throw new Error("Upload aborted");
        attempt++;
        try {
          // Get presigned part URL
          const presignRes = await this.api.presignParts({
            organizationId: this.organizationId,
            projectId: this.projectId,
            mediaId,
            data: {
              upload_id: uploadId,
              part_numbers: [partNumber],
            },
          });

          const partInfo = presignRes.parts.find((p) => p.part_number === partNumber);
          if (!partInfo) {
            throw new Error(`Failed to get presigned URL for part ${partNumber}`);
          }

          // Slice chunk
          const start = (partNumber - 1) * partSizeBytes;
          const end = Math.min(this.file.size, partNumber * partSizeBytes);
          const chunkBlob = this.file.slice(start, end);

          // Upload chunk via XHR
          const etag = await new Promise<string>((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            this.activeXhrs.add(xhr);

            xhr.upload.onprogress = (e) => {
              if (e.lengthComputable) {
                partProgressMap.set(partNumber, e.loaded);
                emitProgress(activeWorkers);
              }
            };

            xhr.onload = () => {
              this.activeXhrs.delete(xhr);
              if (xhr.status >= 200 && xhr.status < 300) {
                const headerEtag = xhr.getResponseHeader("ETag") || "";
                const cleanEtag = headerEtag.replace(/^W\//, "").trim();
                if (!cleanEtag) {
                  reject(new Error(`Missing ETag header in response for part ${partNumber}`));
                } else {
                  resolve(cleanEtag);
                }
              } else {
                reject(new Error(`Part ${partNumber} upload failed (${xhr.status})`));
              }
            };

            xhr.onerror = () => {
              this.activeXhrs.delete(xhr);
              reject(new Error(`Network error uploading part ${partNumber}`));
            };

            xhr.onabort = () => {
              this.activeXhrs.delete(xhr);
              reject(new Error("Upload aborted"));
            };

            xhr.open("PUT", partInfo.upload_url);
            xhr.setRequestHeader("Content-Type", this.file.type || "application/octet-stream");
            xhr.send(chunkBlob);
          });

          // Successfully uploaded
          completedPartsMap.set(partNumber, etag);
          partProgressMap.set(partNumber, end - start);

          // Update local cache
          const completedList: MultipartPartETag[] = Array.from(completedPartsMap.entries()).map(
            ([pn, tag]) => ({ part_number: pn, etag: tag }),
          );
          saveMultipartCache(this.organizationId, this.projectId, this.file, {
            mediaId,
            uploadId,
            partSizeBytes,
            totalParts,
            completedParts: completedList,
            timestamp: Date.now(),
          });

          emitProgress(activeWorkers);
          return;
        } catch (err: unknown) {
          if (this.isAborted) throw err;
          if (attempt >= maxRetries) {
            throw err;
          }
          // Exponential backoff
          await new Promise((r) => setTimeout(r, Math.min(3000, 500 * 2 ** (attempt - 1))));
        }
      }
    };

    // Run parallel workers
    const workerPromises: Promise<void>[] = [];
    const runWorker = async () => {
      while (nextIndex < pendingParts.length) {
        if (this.isAborted) break;
        const partNumber = pendingParts[nextIndex++];
        activeWorkers++;
        emitProgress(activeWorkers);
        try {
          await uploadPartWithRetry(partNumber);
        } finally {
          activeWorkers--;
          emitProgress(activeWorkers);
        }
      }
    };

    const workerCount = Math.min(concurrency, pendingParts.length || 1);
    for (let i = 0; i < workerCount; i++) {
      workerPromises.push(runWorker());
    }

    await Promise.all(workerPromises);

    if (this.isAborted) {
      throw new Error("Upload aborted");
    }

    if (completedPartsMap.size !== totalParts) {
      throw new Error(
        `Incomplete upload: ${completedPartsMap.size}/${totalParts} parts completed`,
      );
    }

    // 4. Complete multipart upload on backend
    this.options.onStatusChange?.("completing");
    const sortedParts: MultipartPartETag[] = Array.from(completedPartsMap.entries())
      .map(([part_number, etag]) => ({ part_number, etag }))
      .sort((a, b) => a.part_number - b.part_number);

    const completedMedia = await this.api.complete({
      organizationId: this.organizationId,
      projectId: this.projectId,
      mediaId,
      data: {
        upload_id: uploadId,
        parts: sortedParts,
      },
    });

    clearMultipartCache(this.organizationId, this.projectId, this.file);
    return completedMedia;
  }

  public pause(): void {
    this.isPaused = true;
    for (const xhr of this.activeXhrs) {
      xhr.abort();
    }
    this.activeXhrs.clear();
    this.options.onStatusChange?.("paused");
  }

  public async resume(metadata?: {
    folderId?: string | null;
    durationSeconds?: number | null;
    width?: number | null;
    height?: number | null;
    thumbnailBlob?: Blob | null;
  }): Promise<MediaResponse> {
    this.isPaused = false;
    this.isAborted = false;
    return this.start(metadata);
  }

  public async abort(uploadId?: string, mediaId?: string): Promise<void> {
    this.isAborted = true;
    for (const xhr of this.activeXhrs) {
      xhr.abort();
    }
    this.activeXhrs.clear();

    const cache = getMultipartCache(this.organizationId, this.projectId, this.file);
    const targetMediaId = mediaId || cache?.mediaId;
    const targetUploadId = uploadId || cache?.uploadId;

    if (targetMediaId && targetUploadId) {
      try {
        await this.api.abort({
          organizationId: this.organizationId,
          projectId: this.projectId,
          mediaId: targetMediaId,
          data: { upload_id: targetUploadId },
        });
      } catch {
        // Suppress abort errors
      }
    }

    clearMultipartCache(this.organizationId, this.projectId, this.file);
    this.options.onStatusChange?.("aborted");
  }
}
