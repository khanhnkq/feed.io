"use client";

import React from "react";
import { Card, Skeleton } from "@/modules/ui";

export function KanbanCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="rounded-xl border border-line bg-surface p-3.5 space-y-3"
    >
      <div className="relative aspect-video w-full rounded-lg bg-paper flex items-center justify-center">
        <Skeleton className="size-8 rounded-md" />
        <div className="absolute top-2 left-2">
          <Skeleton variant="pill" className="h-4 w-10" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Skeleton className="h-3.5 w-3/4" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-16" />
          <Skeleton variant="pill" className="h-4 w-14" />
        </div>
      </div>
    </div>
  );
}

export function KanbanColumnSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="flex flex-col rounded-2xl border border-line bg-surface/50 p-4 min-h-[500px]"
    >
      {/* Column Header */}
      <div className="flex items-center justify-between pb-3 border-b border-line mb-3">
        <div className="flex items-center gap-2">
          <Skeleton variant="circle" className="size-5" />
          <Skeleton className="h-4 w-28" />
        </div>
        <Skeleton variant="pill" className="h-5 w-7" />
      </div>

      {/* Cards Stack */}
      <div className="space-y-3 flex-1">
        <KanbanCardSkeleton />
        <KanbanCardSkeleton />
      </div>
    </div>
  );
}

export function KanbanBoardSkeleton() {
  return (
    <div
      aria-busy="true"
      aria-label="Loading Kanban board"
      className="space-y-6"
    >
      {/* 4 Top Metrics Cards Skeleton */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[0, 1, 2, 3].map((idx) => (
          <Card key={idx} className="border-line bg-surface p-4">
            <div className="flex items-center justify-between mb-2">
              <Skeleton className="h-3.5 w-20" />
              <Skeleton variant="circle" className="size-5" />
            </div>
            <Skeleton className="h-6 w-12" />
          </Card>
        ))}
      </div>

      {/* 4 Columns Skeleton */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((idx) => (
          <KanbanColumnSkeleton key={idx} />
        ))}
      </div>
    </div>
  );
}
