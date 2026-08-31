"use client";

import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Folder,
  Loader2,
  Upload,
} from "lucide-react";
import React, { useRef, useState } from "react";
import {
  useAbortMultipartUpload,
  useCompleteMediaUpload,
  useCompleteMultipartUpload,
  useInitiateMultipartUpload,
  usePresignMediaUpload,
  usePresignMultipartParts,
} from "@feedio/api-client";
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
import {
  type ExtractedMediaMetadata,
  extractMediaMetadataAndThumbnail,
  isImageFile,
  isVideoFile,
} from "../lib/media_metadata";
import {
  MULTIPART_THRESHOLD,
  MultipartUploader,
} from "../lib/multipart_uploader";
import {
  type UploadStatus,
  UploadMediaFileCard,
} from "./upload_media_file_card";

export interface UploadMediaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  projectId: string;
  folderId?: string | null;
  folderName?: string | null;
}

export function UploadMediaDialog({
  open,
  onOpenChange,
  organizationId,
  projectId,
  folderId,
  folderName,
}: UploadMediaDialogProps) {
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

  const activeXhrRef = useRef<XMLHttpRequest | null>(null);
  const activeMultipartUploaderRef = useRef<MultipartUploader | null>(null);

  const presignMutation = usePresignMediaUpload();
  const completeMutation = useCompleteMediaUpload();
  const initiateMultipartMutation = useInitiateMultipartUpload();
  const presignPartsMutation = usePresignMultipartParts();
  const completeMultipartMutation = useCompleteMultipartUpload();
  const abortMultipartMutation = useAbortMultipartUpload();

  const isMultipart = Boolean(file && file.size >= MULTIPART_THRESHOLD);

  const resetState = () => {
    if (activeXhrRef.current) {
      activeXhrRef.current.abort();
      activeXhrRef.current = null;
    }
    if (activeMultipartUploaderRef.current) {
      void activeMultipartUploaderRef.current.abort();
      activeMultipartUploaderRef.current = null;
    }
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
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClose = () => {
    if (status === "uploading" || status === "presigning") {
      const confirmCancel = window.confirm("Cancel ongoing media upload?");
      if (!confirmCancel) return;
    }
    resetState();
    onOpenChange(false);
  };

  const handleFileSelect = async (selectedFile: File) => {
    const isVideo = isVideoFile(selectedFile);
    const isImage = isImageFile(selectedFile);

    if (!isVideo && !isImage) {
      setErrorMessage("Please select a supported video or image file (.mp4, .mov, .png, .jpg, .svg, .webp, etc.)");
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
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      void handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleStartUpload = async () => {
    if (!file) return;

    try {
      setErrorMessage(null);

      // Branch 1: Large File Multipart Upload (file size >= 50MB)
      if (file.size >= MULTIPART_THRESHOLD) {
        setStatus("presigning");
        const uploader = new MultipartUploader(
          file,
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
              else if (s === "completing") setStatus("completing");
              else if (s === "aborted" || s === "error") setStatus("error");
            },
          },
        );
        activeMultipartUploaderRef.current = uploader;

        await uploader.start({
          folderId: folderId || null,
          durationSeconds: meta?.durationSeconds ? meta.durationSeconds : null,
          width: meta?.width ? meta.width : null,
          height: meta?.height ? meta.height : null,
          thumbnailBlob: meta?.thumbnailBlob,
        });

        setStatus("success");
        await queryClient.invalidateQueries({
          queryKey: ["/api/v1/organizations", organizationId, "projects", projectId, "media"],
        });

        setTimeout(() => {
          handleClose();
        }, 1000);
        return;
      }

      // Branch 2: Standard Direct S3 Single PUT Upload (file size < 50MB)
      setStatus("presigning");

      // 1. Get Presigned S3 Upload URLs for media & thumbnail
      const presignResult = await presignMutation.mutateAsync({
        organizationId,
        projectId,
        data: {
          filename: file.name,
          file_size_bytes: file.size,
          mime_type: file.type || "video/mp4",
          folder_id: folderId || null,
          duration_seconds: meta?.durationSeconds ? meta.durationSeconds : null,
          width: meta?.width ? meta.width : null,
          height: meta?.height ? meta.height : null,
          has_thumbnail: Boolean(meta?.thumbnailBlob),
        },
      });

      // 2. Upload thumbnail to S3 if available
      if (presignResult.thumbnail_upload_url && meta?.thumbnailBlob) {
        try {
          await fetch(presignResult.thumbnail_upload_url, {
            method: "PUT",
            headers: { "Content-Type": "image/jpeg" },
            body: meta.thumbnailBlob,
          });
        } catch {
          // Non-blocking thumbnail failure
        }
      }

      // 3. Direct S3 Upload for media via XMLHttpRequest with progress events
      setStatus("uploading");
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        activeXhrRef.current = xhr;

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            setProgress(percent);
            setLoadedBytes(event.loaded);
          }
        };

        xhr.onload = () => {
          activeXhrRef.current = null;
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`S3 upload failed (${xhr.status}): ${xhr.statusText}`));
          }
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
        xhr.setRequestHeader("Content-Type", file.type || "video/mp4");
        xhr.send(file);
      });

      // 4. Mark upload complete in backend
      setStatus("completing");
      await completeMutation.mutateAsync({
        organizationId,
        projectId,
        mediaId: presignResult.media_id,
      });

      setStatus("success");
      await queryClient.invalidateQueries({
        queryKey: ["/api/v1/organizations", organizationId, "projects", projectId, "media"],
      });

      setTimeout(() => {
        handleClose();
      }, 1000);
    } catch (err: unknown) {
      setStatus("error");
      const message = err instanceof Error ? err.message : "Failed to upload media";
      setErrorMessage(message);
    }
  };

  const isWorking = status === "presigning" || status === "uploading" || status === "completing";

  return (
    <Dialog
      isOpen={open}
      onClose={handleClose}
      closeOnEscape={!isWorking}
      ariaLabelledBy="upload-media-dialog-title"
      ariaDescribedBy="upload-media-dialog-description"
      size="lg"
    >
      <DialogCloseButton onClick={handleClose} disabled={isWorking && status !== "uploading"} />
      <DialogHeader>
        <DialogEyebrow>Media Asset</DialogEyebrow>
        <DialogTitle id="upload-media-dialog-title">Upload Media & Assets</DialogTitle>
        <DialogDescription id="upload-media-dialog-description">
          {folderName
            ? `Upload video cuts or image assets to folder: /${folderName}`
            : "Upload video cuts or image assets to project root directory"}
        </DialogDescription>
      </DialogHeader>

      <DialogBody className="space-y-4">
        {/* Destination location badge */}
        <div className="flex items-center gap-2 rounded-lg border border-line bg-paper px-3 py-2 text-xs text-muted">
          <Folder size={14} className="text-ink shrink-0" />
          <span>Destination:</span>
          <span className="font-semibold text-ink truncate">
            {folderName ? `/${folderName}` : "/ (Root)"}
          </span>
        </div>

        {/* Dropzone */}
        {!file && (
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
                if (e.target.files && e.target.files.length > 0) {
                  void handleFileSelect(e.target.files[0]);
                }
              }}
            />
            <div className="mb-3 grid size-12 place-items-center rounded-xl border border-line bg-paper text-ink transition hover:border-ink">
              <Upload size={22} className="text-ink" />
            </div>
            <p className="text-sm font-semibold text-ink">
              Click to browse or drag & drop video or image assets
            </p>
            <p className="mt-1 text-xs text-muted">
              Supports MP4, MOV, WebM, PNG, JPG, SVG, WebP, GIF up to 5GB
            </p>
          </div>
        )}

        {/* Selected File Card with Thumbnail Preview & Progress */}
        {file && (
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
          />
        )}

        {/* Error Banner */}
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
                {status === "uploading" ? `Uploading ${progress}%` : "Processing..."}
              </>
            ) : (
              <>
                <Upload size={14} className="mr-1.5" />
                Start upload
              </>
            )}
          </Button>
        )}
      </DialogFooter>
    </Dialog>
  );
}

export type UploadVideoDialogProps = UploadMediaDialogProps;
export const UploadVideoDialog = UploadMediaDialog;
