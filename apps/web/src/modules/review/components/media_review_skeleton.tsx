"use client";

import React from "react";
import { Skeleton, SkeletonText } from "@/modules/ui";

export function MediaReviewSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading media review workspace"
      className="flex h-screen w-screen flex-col bg-paper overflow-hidden select-none"
    >
      {/* Top Header Bar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-line bg-surface px-4 z-20">
        {/* Left: Back button + Title + Version pill */}
        <div className="flex items-center gap-3">
          <Skeleton className="size-8 rounded-lg" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-28" />
            <span className="text-muted">/</span>
            <Skeleton className="h-5 w-44" />
          </div>
          <Skeleton variant="pill" className="h-6 w-16" />
        </div>

        {/* Right: Actions Bar */}
        <div className="flex items-center gap-2.5">
          {/* Presence avatars */}
          <div className="flex -space-x-1.5 mr-2">
            <Skeleton variant="circle" className="size-6 border-2 border-surface" />
            <Skeleton variant="circle" className="size-6 border-2 border-surface" />
          </div>
          <Skeleton variant="pill" className="h-8 w-24" />
          <Skeleton variant="pill" className="h-8 w-20" />
          <Skeleton className="h-8 w-28 rounded-lg" />
        </div>
      </header>

      {/* Main Workspace Body */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left: Player Canvas Area */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 bg-black/5 relative">
          {/* 16:9 Canvas Screen */}
          <div className="w-full max-w-4xl aspect-video rounded-xl border border-line bg-paper/80 shadow-sm flex flex-col items-center justify-center relative overflow-hidden">
            <Skeleton className="size-16 rounded-2xl" />
            
            {/* Mock Player Control Bar */}
            <div className="absolute bottom-0 inset-x-0 h-12 bg-surface/90 border-t border-line px-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton variant="circle" className="size-7" />
                <Skeleton className="h-3.5 w-20" />
              </div>
              <Skeleton className="h-1.5 w-1/2 rounded-full" />
              <div className="flex items-center gap-2">
                <Skeleton variant="circle" className="size-6" />
                <Skeleton variant="circle" className="size-6" />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Comments / Feedback Sidebar */}
        <aside className="w-80 shrink-0 border-l border-line bg-surface flex flex-col justify-between">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-line space-y-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-5 w-28" />
              <Skeleton variant="pill" className="h-5 w-8" />
            </div>
            {/* Filter Tabs */}
            <div className="flex gap-2">
              <Skeleton variant="pill" className="h-6 w-14" />
              <Skeleton variant="pill" className="h-6 w-20" />
            </div>
          </div>

          {/* Comment Cards List */}
          <div className="flex-1 p-4 space-y-4 overflow-hidden">
            {[0, 1, 2].map((idx) => (
              <div
                key={idx}
                className="rounded-xl border border-line bg-paper/60 p-3 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Skeleton variant="circle" className="size-6" />
                    <Skeleton className="h-3.5 w-24" />
                  </div>
                  <Skeleton variant="pill" className="h-4 w-12" />
                </div>
                <SkeletonText lines={2} gap="sm" lastLineWidth="w-4/5" />
              </div>
            ))}
          </div>

          {/* New Comment Input Box */}
          <div className="p-4 border-t border-line bg-surface space-y-2">
            <Skeleton className="h-16 w-full rounded-lg" />
            <div className="flex justify-end">
              <Skeleton className="h-8 w-20 rounded-md" />
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
