"use client";

import React from "react";
import { Card, CardContent, CardFooter, CardHeader, Skeleton } from "@/modules/ui";

export function OrganizationCardSkeleton() {
  return (
    <Card
      aria-hidden="true"
      className="min-h-[240px] border-line bg-surface"
    >
      <CardContent>
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <Skeleton className="size-10 rounded-lg" />
            <Skeleton className="h-3 w-20" />
          </div>
        </CardHeader>
        <Skeleton className="mt-6 h-6 w-3/4" />
        <Skeleton className="mt-2 h-3.5 w-full" />
        <Skeleton className="mt-1.5 h-3.5 w-4/5" />
      </CardContent>
      <CardFooter>
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="size-4" />
      </CardFooter>
    </Card>
  );
}

export function GlobalDashboardSkeleton() {
  return (
    <main
      aria-busy="true"
      aria-label="Loading organizations"
      className="mx-auto max-w-[1500px] px-5 pb-[60px] pt-[38px] md:px-[42px] md:pb-[72px] md:pt-[54px]"
    >
      {/* Title Header */}
      <section className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between mb-8">
        <div className="space-y-3">
          <Skeleton className="h-12 w-72 max-w-full" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <Skeleton className="h-11 w-40 rounded-lg" />
      </section>

      {/* Filter Toolbar Skeleton */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-4">
        <Skeleton className="h-10 w-full sm:w-80 rounded-lg" />
        <div className="flex items-center gap-2">
          <Skeleton variant="pill" className="h-8 w-24" />
          <Skeleton className="h-8 w-16 rounded-md" />
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2, 3, 4, 5].map((idx) => (
          <OrganizationCardSkeleton key={idx} />
        ))}
      </div>
    </main>
  );
}

export function OrganizationGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, idx) => (
        <OrganizationCardSkeleton key={idx} />
      ))}
    </div>
  );
}


