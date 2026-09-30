"use client";

import React from "react";
import { Card, Skeleton, SkeletonText } from "@/modules/ui";

export function BillingSkeleton() {
  return (
    <main
      id="main-content"
      aria-busy="true"
      aria-label="Loading billing and subscription"
      className="mx-auto max-w-[1500px] px-5 pb-[60px] pt-[38px] md:px-[42px] md:pb-[72px] md:pt-[54px]"
    >
      {/* Header */}
      <div className="space-y-3 mb-8">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      {/* Main Active Subscription Card Skeleton */}
      <Card className="border-line bg-surface p-6 sm:p-8 mb-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="h-7 w-36" />
              <Skeleton variant="pill" className="h-5 w-16" />
            </div>
            <Skeleton className="h-4 w-80 max-w-full" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-32 rounded-lg" />
            <Skeleton className="h-10 w-28 rounded-lg" />
          </div>
        </div>
      </Card>

      {/* Usage Metrics Grid (2 Cards) */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 mb-8">
        {/* Storage Usage Card */}
        <Card className="border-line bg-surface p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <Skeleton variant="circle" className="size-5" />
              <Skeleton className="h-5 w-32" />
            </div>
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-2.5 w-full rounded-full mb-3" />
          <div className="flex justify-between">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3.5 w-16" />
          </div>
        </Card>

        {/* Members Usage Card */}
        <Card className="border-line bg-surface p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <Skeleton variant="circle" className="size-5" />
              <Skeleton className="h-5 w-36" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-2.5 w-full rounded-full mb-3" />
          <div className="flex justify-between">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-3.5 w-20" />
          </div>
        </Card>
      </div>

      {/* Invoices & History Placeholder */}
      <Card className="border-line bg-surface p-6">
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-5 w-40" />
          <Skeleton variant="pill" className="h-8 w-24" />
        </div>
        <div className="divide-y divide-line">
          {[0, 1, 2].map((idx) => (
            <div key={idx} className="flex items-center justify-between py-3.5">
              <div className="space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              <div className="flex items-center gap-4">
                <Skeleton className="h-4 w-16" />
                <Skeleton variant="pill" className="h-5 w-14" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </main>
  );
}
