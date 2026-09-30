"use client";

import React from "react";
import { Card, Skeleton } from "@/modules/ui";

export function MediaCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex h-full flex-col justify-between rounded-xl border border-line bg-surface p-4 text-left"
    >
      {/* 16:9 Aspect Video Thumbnail */}
      <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-line bg-paper flex items-center justify-center">
        <Skeleton className="size-10 rounded-lg" />
        {/* Top Badges */}
        <div className="absolute top-2 left-2 flex gap-1.5">
          <Skeleton variant="pill" className="h-5 w-12" />
          <Skeleton variant="pill" className="h-5 w-14" />
        </div>
      </div>

      {/* Meta Content */}
      <div className="mt-3.5 space-y-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton variant="circle" className="size-5" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-3" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    </div>
  );
}

export function MediaGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
      aria-busy="true"
      aria-label="Loading media assets"
    >
      {Array.from({ length: count }).map((_, idx) => (
        <MediaCardSkeleton key={idx} />
      ))}
    </div>
  );
}

export function FolderCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex items-center justify-between rounded-xl border border-line bg-surface p-4"
    >
      <div className="flex items-center gap-3">
        <Skeleton className="size-9 rounded-lg" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
      <Skeleton variant="circle" className="size-6" />
    </div>
  );
}
