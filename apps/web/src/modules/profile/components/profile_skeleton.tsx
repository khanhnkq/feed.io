"use client";

import React from "react";
import { Card, Skeleton, SkeletonText } from "@/modules/ui";

export function ProfileTabSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading profile"
      className="flex flex-col gap-8 max-w-3xl"
    >
      {/* Avatar Uploader Skeleton */}
      <Card className="border-line bg-surface p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <Skeleton variant="circle" className="size-20 shrink-0" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3.5 w-64 max-w-full" />
            <div className="pt-2 flex gap-3">
              <Skeleton className="h-9 w-28 rounded-lg" />
            </div>
          </div>
        </div>
      </Card>

      {/* Profile Form Skeleton */}
      <Card className="border-line bg-surface p-6 shadow-sm space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-20" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </div>
        <div className="flex justify-end pt-2">
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
      </Card>
    </div>
  );
}

export function ProfileScreenSkeleton() {
  return (
    <main
      id="main-content"
      aria-busy="true"
      aria-label="Loading account settings"
      className="mx-auto max-w-[1500px] px-5 pb-[60px] pt-[38px] md:px-[42px] md:pb-[72px] md:pt-[54px]"
    >
      {/* Header */}
      <section className="flex flex-col items-start gap-6 border-b border-line pb-8 md:flex-row md:items-end md:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
      </section>

      {/* Tabs */}
      <div className="mt-8 flex gap-2">
        <Skeleton variant="pill" className="h-9 w-24" />
        <Skeleton variant="pill" className="h-9 w-24" />
      </div>

      {/* Tab Content */}
      <div className="mt-8">
        <ProfileTabSkeleton />
      </div>
    </main>
  );
}
