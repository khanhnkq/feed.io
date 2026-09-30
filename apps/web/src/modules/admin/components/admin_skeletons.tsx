"use client";

import React from "react";
import { Card, CardContent, CardHeader, Skeleton, SkeletonText } from "../../ui";

export function AdminOverviewSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading overview metrics">
      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((idx) => (
          <Card key={idx} className="border-line bg-surface p-5">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton variant="circle" className="size-8" />
            </div>
            <div className="mt-4 flex items-baseline justify-between">
              <Skeleton className="h-7 w-20" />
              <Skeleton variant="pill" className="h-4 w-12" />
            </div>
            <Skeleton className="mt-3 h-3 w-32" />
          </Card>
        ))}
      </div>

      {/* Storage Breakdown & System Health Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Storage Breakdown */}
        <Card className="border-line bg-surface p-5 lg:col-span-1">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-36" />
            <Skeleton variant="circle" className="size-6" />
          </div>
          <div className="mt-6 space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <Skeleton className="h-3.5 w-24" />
                <Skeleton className="h-3.5 w-16" />
              </div>
              <Skeleton className="h-2.5 w-full rounded-full" />
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-3.5 w-12" />
              </div>
              <Skeleton className="h-2.5 w-full rounded-full" />
            </div>
            <div className="pt-4 border-t border-line">
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
        </Card>

        {/* System Health Table */}
        <Card className="border-line bg-surface p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-5 w-44" />
            <Skeleton variant="pill" className="h-5 w-24" />
          </div>
          <div className="divide-y divide-line">
            {[0, 1, 2, 3].map((row) => (
              <div key={row} className="flex items-center justify-between py-3.5">
                <div className="flex items-center gap-3">
                  <Skeleton variant="circle" className="size-6" />
                  <div>
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="mt-1 h-3 w-20" />
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <Skeleton className="h-3.5 w-16" />
                  <Skeleton variant="pill" className="h-5 w-14" />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Platform Billing Card Placeholder */}
      <Card className="border-line bg-surface p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3.5 w-72" />
          </div>
          <Skeleton variant="pill" className="h-8 w-28" />
        </div>
      </Card>
    </div>
  );
}

export function AdminTableSkeleton({
  columns = 5,
  rows = 5,
}: {
  columns?: number;
  rows?: number;
}) {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading table data">
      {/* Search & Filter Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-10 w-full sm:w-72 rounded-lg" />
        <div className="flex items-center gap-2">
          <Skeleton variant="pill" className="h-8 w-20" />
          <Skeleton variant="pill" className="h-8 w-20" />
          <Skeleton variant="pill" className="h-8 w-24" />
        </div>
      </div>

      {/* Table Container */}
      <Card className="border-line bg-surface overflow-hidden">
        <div className="border-b border-line px-6 py-3.5 flex justify-between">
          {Array.from({ length: columns }).map((_, idx) => (
            <Skeleton
              key={idx}
              className={`h-4 ${idx === 0 ? "w-32" : idx === columns - 1 ? "w-16" : "w-20"}`}
            />
          ))}
        </div>
        <div className="divide-y divide-line">
          {Array.from({ length: rows }).map((_, rIdx) => (
            <div key={rIdx} className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-3">
                <Skeleton variant="circle" className="size-8" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-28" />
                </div>
              </div>
              <Skeleton variant="pill" className="h-5 w-20" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export function AdminScreenSkeleton() {
  return (
    <div className="min-h-screen bg-paper" aria-busy="true" aria-label="Loading admin dashboard">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Top Header */}
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Skeleton className="h-8 w-56" />
            <Skeleton className="mt-2 h-4 w-80" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-28 rounded-lg" />
          </div>
        </div>

        {/* Tab Navigation Pills */}
        <div className="mb-8 flex gap-2 border-b border-line pb-4">
          <Skeleton variant="pill" className="h-9 w-32" />
          <Skeleton variant="pill" className="h-9 w-24" />
          <Skeleton variant="pill" className="h-9 w-32" />
          <Skeleton variant="pill" className="h-9 w-28" />
        </div>

        {/* Default Overview Skeleton */}
        <AdminOverviewSkeleton />
      </div>
    </div>
  );
}
