import React from "react";
import { Skeleton } from "@/modules/ui";

export function InvitationsSkeleton() {
  return (
    <main
      aria-busy="true"
      aria-label="Loading invitations"
      className="mx-auto max-w-[1500px] px-5 pb-[60px] pt-[38px] md:px-[42px] md:pb-[72px] md:pt-[54px]"
    >
      <section className="flex flex-col gap-2">
        <Skeleton className="h-10 w-64 max-w-full" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </section>

      <section className="mt-8 space-y-4">
        {[0, 1].map((idx) => (
          <div
            key={idx}
            className="flex flex-col justify-between gap-6 rounded-2xl border border-line bg-surface p-6 shadow-sm md:flex-row md:items-center"
          >
            <div className="flex items-start gap-4">
              <Skeleton className="size-12 rounded-xl shrink-0" />
              <div className="space-y-2">
                <div className="flex items-center gap-2.5">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton variant="pill" className="h-5 w-16" />
                </div>
                <Skeleton className="h-3.5 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-24 rounded-lg" />
              <Skeleton className="h-10 w-28 rounded-lg" />
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
