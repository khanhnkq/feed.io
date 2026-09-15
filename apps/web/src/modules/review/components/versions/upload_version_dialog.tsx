"use client";

import type { MediaResponse } from "@feedio/api-client";
import {
  useCompleteMediaUpload,
  usePresignMediaUpload,
  useStackMedia,
} from "@feedio/api-client";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Film,
  Layers,
  Loader2,
  Upload,
} from "lucide-react";
import React, { useRef, useState } from "react";
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
  ProgressBar,
} from "@/modules/ui";
import { formatBytes } from "@/modules/media/lib/media_formatters";

export interface UploadVersionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  projectId: string;
  targetMedia: MediaResponse;
  onVersionCreated?: (newMedia: MediaResponse) => void;
}

export function UploadVersionDialog({
  isOpen,
  onClose,
  organizationId,
  projectId,
  targetMedia,
  onVersionCreated,
}: UploadVersionDialogProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [versionLabel, setVersionLabel] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [statusText, setStatusText] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const presignMutation = usePresignMediaUpload();
  const completeMutation = useCompleteMediaUpload();
  const stackMutation = useStackMedia();

  const currentCount = targetMedia.version_count ?? 1;
  const nextVersionNumber = currentCount + 1;

  const resetForm = () => {
    setFile(null);
    setVersionLabel("");
    setIsUploading(false);
    setUploadProgress(0);
    setStatusText("");
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClose = () => {
    if (isUploading) return;
    resetForm();
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setErrorMessage(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
      setErrorMessage(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setErrorMessage("Vui lòng chọn file để tải lên.");
      return;
    }

    try {
      setIsUploading(true);
      setErrorMessage(null);
      setUploadProgress(5);
      setStatusText("Đang khởi tạo tải lên...");

      // 1. Presign Upload URL
      const presign = await presignMutation.mutateAsync({
        organizationId,
        projectId,
        data: {
          filename: file.name,
          file_size_bytes: file.size,
          mime_type: file.type || "video/mp4",
          folder_id: targetMedia.folder_id || null,
        },
      });

      // 2. Upload file to S3 via XHR for real progress
      setStatusText("Đang tải file lên máy chủ lưu trữ...");
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.onprogress = (evt) => {
          if (evt.lengthComputable) {
            const pct = Math.round((evt.loaded / evt.total) * 80);
            setUploadProgress(10 + pct);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Tải lên thất bại với mã lỗi HTTP ${xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error("Lỗi kết nối tới máy chủ lưu trữ"));
        xhr.onabort = () => reject(new Error("Quá trình tải lên đã bị huỷ"));

        xhr.open("PUT", presign.upload_url);
        xhr.setRequestHeader("Content-Type", file.type || "video/mp4");
        xhr.send(file);
      });

      // 3. Mark upload complete in backend
      setUploadProgress(92);
      setStatusText("Đang xác nhận file tải lên...");
      await completeMutation.mutateAsync({
        organizationId,
        projectId,
        mediaId: presign.media_id,
      });

      // 4. Automatically stack newly created media onto targetMedia
      setUploadProgress(96);
      setStatusText(`Đang gom thành phiên bản V${nextVersionNumber}...`);
      const stackedMedia = await stackMutation.mutateAsync({
        organizationId,
        projectId,
        mediaId: targetMedia.id,
        data: {
          source_media_id: presign.media_id,
          version_label: versionLabel.trim() || undefined,
        },
      });

      setUploadProgress(100);
      setStatusText("Hoàn tất!");

      // Invalidate queries
      await queryClient.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey.some(
            (k) => typeof k === "string" && (k.includes(projectId) || k.includes("media")),
          ),
      });

      onVersionCreated?.(stackedMedia);
      handleClose();
    } catch (err: unknown) {
      setIsUploading(false);
      const msg = err instanceof Error ? err.message : "Đã xảy ra lỗi khi tải lên.";
      setErrorMessage(msg);
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={handleClose} size="md">
      <DialogHeader>
        <DialogEyebrow>
          <span className="flex items-center gap-1.5 font-mono text-lime font-bold">
            <Layers size={13} />
            <span>Tạo Version V{nextVersionNumber}</span>
          </span>
        </DialogEyebrow>
        <DialogTitle>Tải lên phiên bản mới</DialogTitle>
        <DialogDescription>
          File mới tải lên sẽ tự động được xếp vào stack của{" "}
          <strong className="text-ink font-semibold">{targetMedia.title}</strong>.
        </DialogDescription>
        <DialogCloseButton onClick={handleClose} disabled={isUploading} />
      </DialogHeader>

      <DialogBody className="space-y-4">
        {/* Dropzone Area */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`group flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl transition cursor-pointer ${
            dragOver
              ? "border-lime bg-lime/10"
              : file
                ? "border-ink bg-surface"
                : "border-line bg-surface/50 hover:border-ink hover:bg-surface"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*,image/*"
            className="hidden"
            onChange={handleFileChange}
            disabled={isUploading}
          />

          <div className="grid size-12 place-items-center rounded-xl bg-paper border border-line mb-3 group-hover:border-ink transition shadow-xs">
            {file ? (
              <Film size={22} className="text-ink" />
            ) : (
              <Upload size={22} className="text-muted group-hover:text-ink transition" />
            )}
          </div>

          {file ? (
            <div className="text-center">
              <p className="font-bold text-sm text-ink truncate max-w-xs">{file.name}</p>
              <p className="text-xs font-mono text-muted mt-0.5">{formatBytes(file.size)}</p>
              {!isUploading && (
                <p className="text-[11px] text-lime font-bold mt-2">Bấm để chọn file khác</p>
              )}
            </div>
          ) : (
            <div className="text-center">
              <p className="font-bold text-sm text-ink">Kéo thả file vào đây hoặc bấm để chọn</p>
              <p className="text-xs text-muted mt-1">Hỗ trợ các định dạng .mp4, .mov, .webm, hình ảnh</p>
            </div>
          )}
        </div>

        {/* Version Label Input */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-ink">
            Nhãn phiên bản (tuỳ chọn)
          </label>
          <input
            type="text"
            value={versionLabel}
            onChange={(e) => setVersionLabel(e.target.value)}
            disabled={isUploading}
            placeholder={`Ví dụ: "Color Grade Pass 2", "Client Cut v${nextVersionNumber}"`}
            className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-xs text-ink placeholder:text-muted focus:border-ink focus:outline-hidden"
          />
        </div>

        {/* Upload Progress */}
        {isUploading && (
          <div className="space-y-2 p-3 rounded-lg border border-line bg-surface">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="flex items-center gap-1.5 text-ink">
                <Loader2 size={13} className="animate-spin text-lime" />
                <span>{statusText}</span>
              </span>
              <span className="font-mono text-muted">{uploadProgress}%</span>
            </div>
            <ProgressBar value={uploadProgress} variant="lime" size="sm" />
          </div>
        )}

        {/* Error Message */}
        {errorMessage && (
          <div className="flex items-start gap-2 p-3 rounded-lg border border-red-200 bg-red-50 text-xs text-red-700">
            <AlertCircle size={15} className="flex-shrink-0 mt-0.5 text-red-600" />
            <p>{errorMessage}</p>
          </div>
        )}
      </DialogBody>

      <DialogFooter>
        <Button variant="outline" size="sm" onClick={handleClose} disabled={isUploading}>
          Huỷ
        </Button>
        <Button
          variant="lime"
          size="sm"
          onClick={handleUpload}
          disabled={!file || isUploading}
        >
          {isUploading ? (
            <>
              <Loader2 size={14} className="mr-1.5 animate-spin" />
              <span>Đang xử lý...</span>
            </>
          ) : (
            <>
              <Upload size={14} className="mr-1.5" />
              <span>Tải lên bản V{nextVersionNumber}</span>
            </>
          )}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
