import type { ReactNode } from "react";
import { Skeleton } from "@/modules/ui";

interface AppShellSkeletonProps {
  children?: ReactNode;
}

export function AppShellSkeleton({ children }: AppShellSkeletonProps) {
  return (
    <div
      className="min-h-screen md:grid md:grid-cols-[240px_minmax(0,1fr)] bg-paper"
      aria-busy="true"
      aria-label="Loading workspace"
    >
      <aside className="relative z-40 flex h-[62px] w-full items-center border-r border-[#282b24] bg-[#161813] px-4 text-[#f8f8f1] md:fixed md:inset-y-0 md:left-0 md:h-auto md:w-60 md:flex-col md:items-stretch md:px-4 md:pb-4 md:pt-6">
        {/* Brand */}
        <div className="flex w-full items-center justify-between md:w-auto">
          <div className="flex items-center gap-3 px-3">
            <span className="grid size-[30px] place-items-center rounded-[8px_3px_8px_3px] bg-lime font-black text-ink">
              F
            </span>
            <span className="text-xl font-extrabold tracking-[-.04em] text-white">
              feedi
            </span>
          </div>
        </div>

        {/* Navigation placeholder items */}
        <div className="mt-8 hidden md:flex md:flex-1 md:flex-col gap-2">
          <Skeleton className="h-3 w-20 mb-2 bg-[#272a22]" />
          <Skeleton className="h-10 w-full rounded-[9px] bg-[#272a22]" />
          <Skeleton className="h-10 w-full rounded-[9px] bg-[#272a22]" />
          <Skeleton className="h-10 w-full rounded-[9px] bg-[#272a22]" />
          <Skeleton className="h-10 w-full rounded-[9px] bg-[#272a22]" />
        </div>

        {/* User Card footer placeholder */}
        <div className="mt-auto hidden md:block pt-6">
          <div className="rounded-[10px] border border-[#272a22] bg-[#1d2019] p-3">
            <div className="flex items-center gap-3">
              <Skeleton className="size-8 rounded-full bg-[#272a22]" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-3.5 w-24 bg-[#272a22]" />
                <Skeleton className="h-2.5 w-32 bg-[#272a22]" />
              </div>
            </div>
          </div>
        </div>
      </aside>

      <div className="min-w-0 md:col-start-2">{children}</div>
    </div>
  );
}
