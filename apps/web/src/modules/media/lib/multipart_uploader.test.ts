import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_PART_SIZE,
  MULTIPART_THRESHOLD,
  type MultipartCacheData,
  type MultipartUploaderApi,
  MultipartUploader,
  clearMultipartCache,
  getMultipartCache,
  getMultipartCacheKey,
  saveMultipartCache,
} from "./multipart_uploader";

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  writable: true,
});

describe("MultipartUploader", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("should generate correct cache key", () => {
    const file = new File(["test data"], "cut.mov", { type: "video/quicktime" });
    const key = getMultipartCacheKey("org-1", "proj-1", file);
    expect(key).toContain("feedio_mp_org-1_proj-1_cut.mov");
  });

  it("should save and load multipart cache in localStorage", () => {
    const file = new File(["test data"], "prores.mov", { type: "video/quicktime" });
    const cacheData: MultipartCacheData = {
      mediaId: "media-123",
      uploadId: "upload-456",
      partSizeBytes: DEFAULT_PART_SIZE,
      totalParts: 4,
      completedParts: [{ part_number: 1, etag: '"tag1"' }],
      timestamp: Date.now(),
    };

    saveMultipartCache("org-1", "proj-1", file, cacheData);
    const loaded = getMultipartCache("org-1", "proj-1", file);
    expect(loaded).toEqual(cacheData);

    clearMultipartCache("org-1", "proj-1", file);
    expect(getMultipartCache("org-1", "proj-1", file)).toBeNull();
  });

  it("should expire old cache after 24h", () => {
    const file = new File(["test data"], "old.mov", { type: "video/quicktime" });
    const oldCacheData: MultipartCacheData = {
      mediaId: "media-old",
      uploadId: "upload-old",
      partSizeBytes: DEFAULT_PART_SIZE,
      totalParts: 2,
      completedParts: [],
      timestamp: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
    };

    saveMultipartCache("org-1", "proj-1", file, oldCacheData);
    const loaded = getMultipartCache("org-1", "proj-1", file);
    expect(loaded).toBeNull();
  });

  it("should check multipart threshold constant", () => {
    expect(MULTIPART_THRESHOLD).toBe(50 * 1024 * 1024);
    expect(DEFAULT_PART_SIZE).toBe(20 * 1024 * 1024);
  });

  it("should initiate and complete multipart upload", async () => {
    const file = new File(["video slice content"], "prores_clip.mov", { type: "video/quicktime" });
    const mockInitiate = vi.fn().mockResolvedValue({
      media_id: "media-999",
      upload_id: "upload-999",
      storage_key: "org/proj/media-999/prores_clip.mov",
      part_size_bytes: DEFAULT_PART_SIZE,
      total_parts: 1,
      thumbnail_upload_url: null,
      thumbnail_storage_key: null,
    });
    const mockPresign = vi.fn().mockResolvedValue({
      parts: [{ part_number: 1, upload_url: "https://mock-s3.local/part-1" }],
    });
    const mockComplete = vi.fn().mockResolvedValue({
      id: "media-999",
      organization_id: "org-1",
      project_id: "proj-1",
      title: "prores_clip",
      filename: "prores_clip.mov",
      file_size_bytes: file.size,
      mime_type: "video/quicktime",
      storage_key: "org/proj/media-999/prores_clip.mov",
      status: "ready",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    const mockAbort = vi.fn().mockResolvedValue({ status: "aborted" });

    const mockApi: MultipartUploaderApi = {
      initiate: mockInitiate,
      presignParts: mockPresign,
      complete: mockComplete,
      abort: mockAbort,
    };

    // Mock XMLHttpRequest for chunk upload
    const mockXhr = {
      upload: { onprogress: null as unknown },
      open: vi.fn(),
      setRequestHeader: vi.fn(),
      send: vi.fn(function (this: { onload?: () => void; status: number; getResponseHeader: (h: string) => string }) {
        this.status = 200;
        this.getResponseHeader = () => '"mock_etag_123"';
        setTimeout(() => this.onload?.(), 10);
      }),
      getResponseHeader: vi.fn().mockReturnValue('"mock_etag_123"'),
      status: 200,
      onload: null as unknown,
      onerror: null as unknown,
      onabort: null as unknown,
    };
    vi.stubGlobal("XMLHttpRequest", vi.fn(() => mockXhr));

    const uploader = new MultipartUploader(file, "org-1", "proj-1", mockApi);
    const result = await uploader.start();

    expect(mockInitiate).toHaveBeenCalledTimes(1);
    expect(mockPresign).toHaveBeenCalledTimes(1);
    expect(mockComplete).toHaveBeenCalledTimes(1);
    expect(result.status).toBe("ready");
    expect(result.id).toBe("media-999");
  });

  it("should pause upload and call onStatusChange with paused", () => {
    const file = new File(["test video"], "pause_test.mov", { type: "video/quicktime" });
    const onStatusChange = vi.fn();
    const mockApi: MultipartUploaderApi = {
      initiate: vi.fn(),
      presignParts: vi.fn(),
      complete: vi.fn(),
      abort: vi.fn(),
    };

    const uploader = new MultipartUploader(file, "org-1", "proj-1", mockApi, {
      onStatusChange,
    });

    uploader.pause();
    expect(onStatusChange).toHaveBeenCalledWith("paused");
  });

  it("should abort upload, clear cache and call backend abort", async () => {
    const file = new File(["test video"], "abort_test.mov", { type: "video/quicktime" });
    const mockAbort = vi.fn().mockResolvedValue({ status: "aborted" });
    const onStatusChange = vi.fn();
    const mockApi: MultipartUploaderApi = {
      initiate: vi.fn(),
      presignParts: vi.fn(),
      complete: vi.fn(),
      abort: mockAbort,
    };

    saveMultipartCache("org-1", "proj-1", file, {
      mediaId: "media-abort",
      uploadId: "upload-abort",
      partSizeBytes: DEFAULT_PART_SIZE,
      totalParts: 2,
      completedParts: [],
      timestamp: Date.now(),
    });

    const uploader = new MultipartUploader(file, "org-1", "proj-1", mockApi, {
      onStatusChange,
    });

    await uploader.abort("upload-abort", "media-abort");

    expect(mockAbort).toHaveBeenCalledWith({
      organizationId: "org-1",
      projectId: "proj-1",
      mediaId: "media-abort",
      data: { upload_id: "upload-abort" },
    });
    expect(onStatusChange).toHaveBeenCalledWith("aborted");
    expect(getMultipartCache("org-1", "proj-1", file)).toBeNull();
  });
});
