"use client";

import React from "react";
import { Card, CardContent, CardFooter, CardHeader, Skeleton } from "@/modules/ui";

export function OrganizationFeatureCardSkeleton() {
  return (
    <Card
      aria-hidden="true"
      className="min-h-[260px] border-line bg-surface"
    >
      <CardContent>
        <CardHeader>
          <div className="flex items-center gap-2.5">
            <Skeleton className="size-10 rounded-lg" />
            <Skeleton className="h-2.5 w-20" />
          </div>
        </CardHeader>
        <Skeleton className="mt-6 h-6 w-36" />
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

export function OrganizationDashboardSkeleton() {
  return (
    <main
      id="main-content"
      aria-busy="true"
      aria-label="Loading organization overview"
      className="mx-auto max-w-[1500px] px-5 pb-[60px] pt-[38px] md:px-[42px] md:pb-[72px] md:pt-[54px]"
    >
      <section className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div className="max-w-4xl space-y-4">
          <Skeleton className="h-16 w-80 max-w-full" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>

        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-36 rounded-lg" />
        </div>
      </section>

      <section
        className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
        aria-label="Loading organization areas"
      >
        {[0, 1, 2].map((idx) => (
          <OrganizationFeatureCardSkeleton key={idx} />
        ))}
      </section>
    </main>
  );
}
