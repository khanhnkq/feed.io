"use client";

import type { MediaResponse } from "@feedio/api-client";
import {
  useAbortMultipartUpload,
  useCompleteMediaUpload,
  useCompleteMultipartUpload,
  useInitiateMultipartUpload,
  usePresignMediaUpload,
  usePresignMultipartParts,
  useStackMedia,
} from "@feedio/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Layers, Loader2, Upload } from "lucide-react";
import React, { useRef, useState } from "react";
import {
  type ExtractedMediaMetadata,
  extractMediaMetadataAndThumbnail,
  isImageFile,
  isVideoFile,
} from "@/modules/media/lib/media_metadata";
import {
  MULTIPART_THRESHOLD,
  MultipartUploader,
} from "@/modules/media/lib/multipart_uploader";
import {
  type UploadStatus,
  UploadMediaFileCard,
} from "@/modules/media/components/upload_media_file_card";
import {
  Button,
  Dialog,
  DialogBody,
  DialogCloseButton,
  DialogDescription,
  DialogEyebrow,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/modules/ui";

export interface UploadVersionDialogProps {
  isOpen?: boolean;
  open?: boolean;
  onClose?: () => void;
  onOpenChange?: (open: boolean) => void;
  organizationId: string;
  projectId: string;
  targetMedia: MediaResponse;
  onVersionCreated?: (newMedia: MediaResponse) => void;
}

export function UploadVersionDialog({
  isOpen,
  open,
  onClose,
  onOpenChange,
  organizationId,
  projectId,
  targetMedia,
  onVersionCreated,
}: UploadVersionDialogProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [meta, setMeta] = useState<ExtractedMediaMetadata | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [loadedBytes, setLoadedBytes] = useState(0);
  const [speedBytesPerSec, setSpeedBytesPerSec] = useState(0);
  const [etaSeconds, setEtaSeconds] = useState<number | null>(null);
  const [completedParts, setCompletedParts] = useState(0);
  const [totalParts, setTotalParts] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [versionLabel, setVersionLabel] = useState("");

  const activeXhrRef = useRef<XMLHttpRequest | null>(null);
  const activeMultipartUploaderRef = useRef<MultipartUploader | null>(null);

  const presignMutation = usePresignMediaUpload();
  const completeMutation = useCompleteMediaUpload();
  const initiateMultipartMutation = useInitiateMultipartUpload();
  const presignPartsMutation = usePresignMultipartParts();
  const completeMultipartMutation = useCompleteMultipartUpload();
  const abortMultipartMutation = useAbortMultipartUpload();
  const stackMutation = useStackMedia();

  const isModalOpen = open ?? isOpen ?? false;
  const currentCount = targetMedia.version_count ?? 1;
  const nextVersionNumber = currentCount + 1;
  const isMultipart = Boolean(file && file.size >= MULTIPART_THRESHOLD);
  const isWorking =
    status === "presigning" || status === "uploading" || status === "completing";

  const resetState = () => {
    activeXhrRef.current?.abort();
    activeXhrRef.current = null;
    void activeMultipartUploaderRef.current?.abort();
    activeMultipartUploaderRef.current = null;
    setFile(null);
    setMeta(null);
    setIsExtracting(false);
    setStatus("idle");
    setProgress(0);
    setLoadedBytes(0);
    setSpeedBytesPerSec(0);
    setEtaSeconds(null);
    setCompletedParts(0);
    setTotalParts(0);
    setErrorMessage(null);
    setVersionLabel("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    if (isWorking && status !== "uploading") return;
    resetState();
    onClose?.();
    onOpenChange?.(false);
  };

  const handleFileSelect = async (selectedFile: File) => {
    if (!isVideoFile(selectedFile) && !isImageFile(selectedFile)) {
      setErrorMessage(
        "Please select a supported video or image file (.mp4, .mov, .png, .jpg, .svg, .webp, etc.)",
      );
      return;
    }
    setErrorMessage(null);
    setFile(selectedFile);
    setIsExtracting(true);
    try {
      const extracted = await extractMediaMetadataAndThumbnail(selectedFile);
      setMeta(extracted);
    } catch {
      setMeta(null);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.[0]) void handleFileSelect(e.dataTransfer.files[0]);
  };

  const finalizeStackedMedia = async (sourceMediaId: string) => {
    setStatus("completing");
    const stacked = await stackMutation.mutateAsync({
      organizationId,
      projectId,
      mediaId: targetMedia.id,
      data: {
        source_media_id: sourceMediaId,
        version_label: versionLabel.trim() || undefined,
      },
    });

    setStatus("success");
    await queryClient.invalidateQueries({
      predicate: (q) =>
        Array.isArray(q.queryKey) &&
        q.queryKey.some(
          (k) =>
            typeof k === "string" &&
            (k.includes(projectId) || k.includes("media") || k.includes("versions")),
        ),
    });

    onVersionCreated?.(stacked);
    setTimeout(handleClose, 1000);
  };

  const uploadViaDirectPut = async (targetFile: File) => {
    const presignResult = await presignMutation.mutateAsync({
      organizationId,
      projectId,
      data: {
        filename: targetFile.name,
        file_size_bytes: targetFile.size,
        mime_type: targetFile.type || "video/mp4",
        folder_id: targetMedia.folder_id || null,
        duration_seconds: meta?.durationSeconds || null,
        width: meta?.width || null,
        height: meta?.height || null,
        has_thumbnail: Boolean(meta?.thumbnailBlob),
      },
    });

    if (presignResult.thumbnail_upload_url && meta?.thumbnailBlob) {
      try {
        await fetch(presignResult.thumbnail_upload_url, {
          method: "PUT",
          headers: { "Content-Type": "image/jpeg" },
          body: meta.thumbnailBlob,
        });
      } catch {
        // Non-blocking thumbnail error
      }
    }

    setStatus("uploading");
    const startTime = Date.now();
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      activeXhrRef.current = xhr;
      xhr.upload.onprogress = (evt) => {
        if (!evt.lengthComputable) return;
        setProgress(Math.round((evt.loaded / evt.total) * 100));
        setLoadedBytes(evt.loaded);
        const elapsed = (Date.now() - startTime) / 1000;
        if (elapsed > 0) {
          const spd = evt.loaded / elapsed;
          setSpeedBytesPerSec(spd);
          setEtaSeconds(spd > 0 ? Math.round((evt.total - evt.loaded) / spd) : null);
        }
      };
      xhr.onload = () => {
        activeXhrRef.current = null;
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error(`S3 upload failed (${xhr.status}): ${xhr.statusText}`));
      };
      xhr.onerror = () => {
        activeXhrRef.current = null;
        reject(new Error("Network connection error to storage server"));
      };
      xhr.onabort = () => {
        activeXhrRef.current = null;
        reject(new Error("Upload cancelled"));
      };
      xhr.open("PUT", presignResult.upload_url);
      xhr.setRequestHeader("Content-Type", targetFile.type || "video/mp4");
      xhr.send(targetFile);
    });

    setStatus("completing");
    const completed = await completeMutation.mutateAsync({
      organizationId,
      projectId,
      mediaId: presignResult.media_id,
    });
    await finalizeStackedMedia(completed.id || presignResult.media_id);
  };

  const uploadViaMultipart = async (targetFile: File) => {
    const uploader = new MultipartUploader(
      targetFile,
      organizationId,
      projectId,
      {
        initiate: (p) => initiateMultipartMutation.mutateAsync(p),
        presignParts: (p) => presignPartsMutation.mutateAsync(p),
        complete: (p) => completeMultipartMutation.mutateAsync(p),
        abort: (p) => abortMultipartMutation.mutateAsync(p),
      },
      {
        concurrency: 3,
        onProgress: (p) => {
          setProgress(p.percent);
          setLoadedBytes(p.loadedBytes);
          setSpeedBytesPerSec(p.speedBytesPerSec);
          setEtaSeconds(p.etaSeconds);
          setCompletedParts(p.completedParts);
          setTotalParts(p.totalParts);
        },
        onStatusChange: (s) => {
          if (s === "initiating") setStatus("presigning");
          else if (s === "uploading") setStatus("uploading");
          else if (s === "paused") setStatus("paused");
          else if (s === "completing") setStatus("completing");
          else if (s === "aborted" || s === "error") setStatus("error");
        },
      },
    );
    activeMultipartUploaderRef.current = uploader;

    const uploaded = await uploader.start({
      folderId: targetMedia.folder_id || null,
      durationSeconds: meta?.durationSeconds || null,
      width: meta?.width || null,
      height: meta?.height || null,
      thumbnailBlob: meta?.thumbnailBlob,
    });
    await finalizeStackedMedia(uploaded.id);
  };

  const handleStartUpload = async () => {
    if (!file) return;
    try {
      setErrorMessage(null);
      setStatus("presigning");
      if (file.size >= MULTIPART_THRESHOLD) await uploadViaMultipart(file);
      else await uploadViaDirectPut(file);
    } catch (err: unknown) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Failed to upload new version");
    }
  };

  const handlePause = () => {
    if (activeMultipartUploaderRef.current) {
      activeMultipartUploaderRef.current.pause();
      setStatus("paused");
    }
  };

  const handleResume = async () => {
    if (activeMultipartUploaderRef.current) {
      setStatus("uploading");
      setErrorMessage(null);
      try {
        const uploaded = await activeMultipartUploaderRef.current.resume({
          folderId: targetMedia.folder_id || null,
          durationSeconds: meta?.durationSeconds || null,
          width: meta?.width || null,
          height: meta?.height || null,
          thumbnailBlob: meta?.thumbnailBlob,
        });
        await finalizeStackedMedia(uploaded.id);
      } catch (err: unknown) {
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : "Failed to resume upload");
      }
    } else {
      await handleStartUpload();
    }
  };

  return (
    <Dialog
      isOpen={isModalOpen}
      onClose={handleClose}
      closeOnEscape={!isWorking}
      ariaLabelledBy="upload-version-dialog-title"
      ariaDescribedBy="upload-version-dialog-description"
      size="lg"
    >
      <DialogCloseButton onClick={handleClose} disabled={isWorking && status !== "uploading"} />
      <DialogHeader>
        <DialogEyebrow>Create Version V{nextVersionNumber}</DialogEyebrow>
        <DialogTitle id="upload-version-dialog-title">Upload New Version</DialogTitle>
        <DialogDescription id="upload-version-dialog-description">
          Uploaded file will automatically be stacked under{" "}
          <strong className="font-semibold text-ink">{targetMedia.title}</strong>
        </DialogDescription>
      </DialogHeader>

      <DialogBody className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border border-line bg-paper px-3 py-2 text-xs text-muted">
          <div className="flex items-center gap-2 min-w-0">
            <Layers size={14} className="text-ink shrink-0" />
            <span>Stack Target:</span>
            <span className="font-semibold text-ink truncate max-w-[260px]" title={targetMedia.title}>
              {targetMedia.title}
            </span>
          </div>
          <span className="shrink-0 rounded border border-lime/50 bg-lime/20 px-2 py-0.5 text-[10px] font-mono font-bold text-ink">
            Target Version: V{nextVersionNumber}
          </span>
        </div>

        {!file ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center transition-all ${
              dragOver
                ? "border-ink bg-[#f3f4ee] shadow-[2px_2px_0px_#11130f]"
                : "border-line bg-surface hover:border-ink hover:bg-paper"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*,image/*,.mp4,.mov,.webm,.mkv,.png,.jpg,.jpeg,.webp,.svg,.gif,.avif,.bmp"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) void handleFileSelect(e.target.files[0]);
              }}
            />
            <div className="mb-3 grid size-12 place-items-center rounded-xl border border-line bg-paper text-ink transition hover:border-ink">
              <Upload size={22} className="text-ink" />
            </div>
            <p className="text-sm font-semibold text-ink">
              Click to browse or drag & drop video or image assets
            </p>
            <p className="mt-1 text-xs text-muted">
              Supports MP4, MOV, WebM, PNG, JPG, SVG, WebP, GIF up to 50GB
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <UploadMediaFileCard
              file={file}
              meta={meta}
              isExtracting={isExtracting}
              status={status}
              progress={progress}
              loadedBytes={loadedBytes}
              isWorking={isWorking}
              isMultipart={isMultipart}
              completedParts={completedParts}
              totalParts={totalParts}
              speedBytesPerSec={speedBytesPerSec}
              etaSeconds={etaSeconds}
              onReset={resetState}
              onPause={handlePause}
              onResume={handleResume}
              onRetry={() => void handleStartUpload()}
            />

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-ink">
                Version Description <span className="text-muted font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={versionLabel}
                onChange={(e) => setVersionLabel(e.target.value)}
                disabled={isWorking}
                placeholder={`e.g. "Color Grade Pass 2", "Client Cut v${nextVersionNumber}"`}
                className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-xs text-ink placeholder:text-muted focus:border-ink focus:outline-hidden"
              />
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <p className="font-medium">{errorMessage}</p>
          </div>
        )}
      </DialogBody>

      <DialogFooter>
        <Button
          type="button"
          variant="outline"
          onClick={handleClose}
          disabled={isWorking && status !== "uploading"}
        >
          {status === "success" ? "Done" : "Cancel"}
        </Button>

        {status !== "success" && (
          <Button
            type="button"
            variant="primary"
            onClick={handleStartUpload}
            disabled={!file || isWorking}
          >
            {isWorking ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {status === "uploading"
                  ? `Uploading ${progress}%`
                  : status === "completing"
                    ? `Stacking V${nextVersionNumber}...`
                    : "Processing..."}
              </>
            ) : (
              <>
                <Upload size={14} className="mr-1.5" />
                <span>Upload Version V{nextVersionNumber}</span>
              </>
            )}
          </Button>
        )}
      </DialogFooter>
    </Dialog>
  );
}
