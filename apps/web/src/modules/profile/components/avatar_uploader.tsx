"use client";

import React, { useRef, useState } from "react";
import { Loader2, Pencil } from "lucide-react";
import { useUploadMyAvatar, getGetMyProfileQueryKey } from "@feedio/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, Card, CardContent } from "@/modules/ui";
import { FormError } from "@/modules/auth/components/form_controls";

export interface AvatarUploaderProps {
  displayName: string;
  avatarUrl?: string | null;
  jobTitle?: string | null;
}

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export function AvatarUploader({
  displayName,
  avatarUrl,
  jobTitle,
}: AvatarUploaderProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const uploadMutation = useUploadMyAvatar({
    mutation: {
      onSuccess: () => {
        setErrorMessage(null);
        queryClient.invalidateQueries({ queryKey: getGetMyProfileQueryKey() });
      },
      onError: (err: unknown) => {
        const error = err as { response?: { data?: { detail?: string } } };
        setErrorMessage(
          error?.response?.data?.detail || "Failed to upload avatar.",
        );
      },
    },
  });

  const isBusy = uploadMutation.isPending;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_SIZE_BYTES) {
      setErrorMessage(
        "File size exceeds 5MB limit. Please choose a smaller image.",
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      setErrorMessage(
        "Unsupported file type. Please choose a JPEG, PNG, WebP, or GIF image.",
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setErrorMessage(null);
    uploadMutation.mutate({ data: { file } });
  };

  return (
    <div className="flex flex-col gap-2">
      <Card className="border-line bg-surface p-6 shadow-sm">
        <CardContent className="mt-0 p-0 flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleFileChange}
            disabled={isBusy}
          />

          {/* Clickable circular avatar with hover pencil effect */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isBusy}
            className="relative group shrink-0 size-20 rounded-full overflow-hidden border-2 border-line shadow-sm flex items-center justify-center bg-paper cursor-pointer outline-none transition focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-focus focus:ring-2 focus:ring-lime/60"
            title="Click to change avatar"
            aria-label="Click to change avatar"
          >
            <Avatar
              size="xl"
              src={avatarUrl}
              name={displayName}
              className="size-full rounded-full aspect-square object-cover"
            />

            {/* Hover overlay with pencil icon */}
            <div className="absolute inset-0 bg-ink/60 backdrop-blur-[1px] opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white gap-1 pointer-events-none">
              <Pencil size={18} className="drop-shadow" />
            </div>

            {/* Loading spinner overlay */}
            {isBusy && (
              <div className="absolute inset-0 bg-ink/70 rounded-full flex items-center justify-center text-white">
                <Loader2 className="animate-spin text-white" size={24} />
              </div>
            )}
          </button>

          {/* Profile Info Preview */}
          <div className="flex flex-col justify-center min-w-0 flex-1">
            <h4 className="text-base font-bold text-ink truncate">
              {displayName.trim() || "Your Name"}
            </h4>

            <p className="text-xs font-medium text-muted mt-0.5 truncate">
              {jobTitle?.trim() || "Creative Member"}
            </p>

            {errorMessage && (
              <div className="mt-2">
                <FormError message={errorMessage} />
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <p className="text-[11px] text-muted px-1">
        PNG, JPEG, WebP or GIF up to 5MB. Recommended square aspect ratio. Click
        avatar to change.
      </p>
    </div>
  );
}
