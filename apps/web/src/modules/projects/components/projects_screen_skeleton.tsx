"use client";

import React from "react";
import { Skeleton } from "@/modules/ui";
import { ProjectSkeleton } from "./project_skeleton";

export function ProjectsScreenSkeleton() {
  return (
    <main
      aria-busy="true"
      aria-label="Loading projects"
      className="mx-auto max-w-[1500px] px-5 pb-[60px] pt-[38px] md:px-[42px] md:pb-[72px] md:pt-[54px]"
    >
      <section className="flex flex-col items-start gap-7 md:flex-row md:items-end md:justify-between">
        <div className="space-y-3">
          <Skeleton className="h-16 w-80 max-w-full" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <Skeleton className="h-11 w-36 rounded-lg" />
      </section>

      {/* Filter Bar Skeleton */}
      <div className="mt-8 mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-line pb-4">
        <Skeleton className="h-10 w-full sm:w-80 rounded-lg" />
        <div className="flex items-center gap-2">
          <Skeleton variant="pill" className="h-8 w-24" />
          <Skeleton variant="pill" className="h-8 w-20" />
          <Skeleton className="h-8 w-16 rounded-md" />
        </div>
      </div>

      <div className="mt-8">
        <ProjectSkeleton />
      </div>
    </main>
  );
}
