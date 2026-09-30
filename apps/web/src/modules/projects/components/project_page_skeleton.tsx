"use client";

import React from "react";
import { FolderCardSkeleton, MediaGridSkeleton } from "@/modules/media";
import { Skeleton } from "@/modules/ui";

export function ProjectPageSkeleton() {
  return (
    <main
      aria-busy="true"
      aria-label="Loading project workspace"
      className="mx-auto max-w-[1500px] px-5 pb-[60px] pt-[38px] md:px-[42px] md:pb-[72px] md:pt-[54px]"
    >
      {/* Header & Breadcrumbs Skeleton */}
      <div className="space-y-4">
        {/* Breadcrumb line */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-24" />
          <span className="text-muted">/</span>
          <Skeleton className="h-4 w-32" />
        </div>

        {/* Project Title & Action Buttons */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-60" />
            <Skeleton variant="pill" className="h-5 w-20" />
          </div>
          <div className="flex items-center gap-2.5">
            {/* Avatar stack placeholder */}
            <div className="flex -space-x-2 mr-2">
              {[0, 1, 2].map((idx) => (
                <Skeleton
                  key={idx}
                  variant="circle"
                  className="size-7 border-2 border-surface"
                />
              ))}
            </div>
            <Skeleton className="h-9 w-28 rounded-lg" />
            <Skeleton className="h-9 w-32 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Filter / View Toolbar Skeleton */}
      <div className="mt-8 mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-4">
        <Skeleton className="h-10 w-full sm:w-80 rounded-lg" />
        <div className="flex items-center gap-2">
          <Skeleton variant="pill" className="h-8 w-24" />
          <Skeleton variant="pill" className="h-8 w-20" />
          <Skeleton className="h-8 w-16 rounded-md" />
        </div>
      </div>

      {/* Folders Section Skeleton */}
      <section className="mt-6">
        <Skeleton className="h-4 w-28 mb-3" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((idx) => (
            <FolderCardSkeleton key={idx} />
          ))}
        </div>
      </section>

      {/* Media Assets Section Skeleton */}
      <section className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-8 w-28 rounded-md" />
        </div>
        <MediaGridSkeleton count={8} />
      </section>
    </main>
  );
}
