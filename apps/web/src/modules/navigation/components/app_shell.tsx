"use client";

import {
  getGetCurrentUserQueryKey,
  type CurrentUserResponse,
  type OrganizationResponse,
  useListMyInvitations,
  useLogout,
} from "@feedio/api-client";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Bell,
  Building2,
  Film,
  SquareKanban,
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  Settings2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { Avatar } from "@/modules/ui";
import { NotificationBell } from "@/modules/notifications";

export type AppShellContext = "global" | "organization" | "project";

interface AppShellProps {
  children: ReactNode;
  user: CurrentUserResponse;
  context?: AppShellContext;
  organization?: OrganizationResponse;
  projectName?: string;
  projectId?: string;
}

const navClass =
  "flex min-h-11 w-full items-center gap-3 rounded-[9px] px-3 text-left text-sm text-[#9fa296] transition-colors hover:bg-[#272a22] hover:text-white focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus";

export function AppShell({
  children,
  user,
  context = "global",
  organization,
  projectName,
  projectId,
}: AppShellProps) {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const logout = useLogout({
    mutation: {
      onSettled: async () => {
        await queryClient.resetQueries({
          queryKey: getGetCurrentUserQueryKey(),
        });
      },
    },
  });
  const initials = getInitials(user.display_name);

  const invitationsQuery = useListMyInvitations(undefined, {
    query: {
      enabled: !!user,
      retry: false,
    },
  });
  const pendingInvitationsCount = invitationsQuery.data?.items.length ?? 0;

  interface NavigationItem {
    label: string;
    href: string;
    icon: typeof LayoutDashboard;
    available: boolean;
    exact?: boolean;
    badge?: number;
  }

  const globalNavigation: NavigationItem[] = [
    {
      label: "Organizations",
      href: "/app",
      icon: Building2,
      available: true,
      exact: true,
    },
    { label: "Activity", href: "/app/activity", icon: Users, available: false },
    {
      label: "Invitations",
      href: "/app/invitations",
      icon: Bell,
      available: true,
      badge: pendingInvitationsCount > 0 ? pendingInvitationsCount : undefined,
    },
  ];

  const orgSlug = organization?.slug ?? "";
  const orgNavigation: NavigationItem[] = [
    {
      label: "Overview",
      href: `/app/organizations/${orgSlug}`,
      icon: LayoutDashboard,
      available: true,
      exact: true,
    },
    {
      label: "Projects",
      href: `/app/organizations/${orgSlug}/projects`,
      icon: SquareKanban,
      available: true,
      exact: false,
    },
    {
      label: "Reviews",
      href: `/app/organizations/${orgSlug}/reviews`,
      icon: Film,
      available: false,
    },
    {
      label: "Comments",
      href: `/app/organizations/${orgSlug}/comments`,
      icon: MessageSquareText,
      available: false,
    },
    {
      label: "Team",
      href: `/app/organizations/${orgSlug}/team`,
      icon: Users,
      available: true,
    },
  ];

  const currentProjectId = projectId ?? "";
  const projectNavigation: NavigationItem[] = [
    {
      label: "Media & Assets",
      href: `/app/organizations/${orgSlug}/projects/${currentProjectId}`,
      icon: Film,
      available: true,
      exact: true,
    },
    {
      label: "Review Kanban",
      href: `/app/organizations/${orgSlug}/projects/${currentProjectId}/kanban`,
      icon: SquareKanban,
      available: true,
      exact: true,
    },
    {
      label: "Settings",
      href: `/app/organizations/${orgSlug}/projects/${currentProjectId}/settings`,
      icon: Settings2,
      available: false,
    },
  ];

  const navItems =
    context === "project"
      ? projectNavigation
      : context === "organization"
        ? orgNavigation
        : globalNavigation;

  return (
    <div className="min-h-screen md:grid md:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="relative z-10 flex h-[62px] w-full items-center border-r border-[#282b24] bg-[#161813] px-4 text-[#f8f8f1] md:fixed md:inset-y-0 md:left-0 md:h-auto md:w-60 md:flex-col md:items-stretch md:px-4 md:pb-4 md:pt-6">
        <Link
          className="flex items-center gap-3 px-3 text-xl font-extrabold tracking-[-.04em] focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-focus"
          href="/app"
          aria-label="Feed.io home"
        >
          <span className="grid size-[30px] place-items-center rounded-[8px_3px_8px_3px] bg-lime font-black text-ink">
            F
          </span>
          <span>feed.io</span>
        </Link>

        {context === "project" ? (
          <div className="mt-4 hidden md:block">
            <Link
              href={`/app/organizations/${orgSlug}/projects`}
              className="flex items-center gap-2 px-3 py-1.5 text-xs text-[#8b8e83] transition hover:text-white"
            >
              <ArrowLeft size={14} /> All projects
            </Link>
          </div>
        ) : context === "organization" ? (
          <div className="mt-4 hidden md:block">
            <Link
              href="/app"
              className="flex items-center gap-2 px-3 py-1.5 text-xs text-[#8b8e83] transition hover:text-white"
            >
              <ArrowLeft size={14} /> All organizations
            </Link>
          </div>
        ) : null}

        <nav
          className="mt-6 hidden md:flex md:flex-1 md:flex-col"
          aria-label="Main navigation"
        >
          <p className="mb-2.5 px-3 text-[11px] font-extrabold uppercase tracking-[.13em] text-[#8b8e83]">
            {context === "project"
              ? projectName || "Project"
              : context === "organization" && organization
                ? organization.name
                : "Global"}
          </p>
          <div className="flex flex-col gap-1">
            {navItems.map(
              ({ label, href, icon: Icon, available, exact, badge }) => {
                const isActive = exact
                  ? pathname === href
                  : pathname.startsWith(href);
                return available ? (
                  <Link
                    className={`${navClass} ${isActive ? "bg-[#272a22] text-white" : ""}`}
                    href={href}
                    key={label}
                  >
                    <span className="grid w-5 shrink-0 place-items-center">
                      <Icon aria-hidden size={18} strokeWidth={1.8} />
                    </span>
                    <span>{label}</span>
                    {badge ? (
                      <span className="ml-auto grid size-4 place-items-center rounded-full bg-lime text-[10px] font-bold text-ink">
                        {badge}
                      </span>
                    ) : isActive ? (
                      <span className="ml-auto size-1.5 rounded-full bg-lime" />
                    ) : null}
                  </Link>
                ) : (
                  <span
                    className={`${navClass} cursor-not-allowed opacity-50`}
                    key={label}
                    aria-disabled="true"
                  >
                    <span className="grid w-5 shrink-0 place-items-center">
                      <Icon aria-hidden size={18} strokeWidth={1.8} />
                    </span>
                    <span>{label}</span>
                    <small className="ml-auto font-mono text-[8px] font-bold uppercase tracking-[.08em] text-[#777b70]">
                      Soon
                    </small>
                  </span>
                );
              },
            )}
          </div>

          <div className="mt-auto flex flex-col gap-2 pt-6">
            <button
              className={`${navClass} hidden disabled:cursor-not-allowed disabled:opacity-50 md:flex`}
              type="button"
              disabled
              title="Settings coming soon"
            >
              <span className="grid w-5 shrink-0 place-items-center">
                <Settings2 aria-hidden size={18} strokeWidth={1.8} />
              </span>
              <span>Settings</span>
              <small className="ml-auto font-mono text-[8px] font-bold uppercase tracking-[.08em] text-[#777b70]">
                Soon
              </small>
            </button>

            <div className="rounded-[10px] border border-[#272a22] bg-[#1d2019] p-3 text-white">
              <div className="flex items-center gap-3">
                <Avatar initials={initials} />
                <span className="min-w-0 flex-1 grid gap-0.5">
                  <strong className="overflow-hidden text-ellipsis whitespace-nowrap text-xs font-semibold text-white">
                    {user.display_name}
                  </strong>
                  <small className="overflow-hidden text-ellipsis whitespace-nowrap text-[10px] text-[#85887d]">
                    {user.email}
                  </small>
                </span>
                <button
                  className="grid size-8 shrink-0 place-items-center rounded-md border-0 bg-transparent text-[#8b8e83] hover:bg-[#292c25] hover:text-white disabled:cursor-wait disabled:opacity-50 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus"
                  type="button"
                  aria-label="Sign out"
                  title="Sign out"
                  disabled={logout.isPending}
                  onClick={() => logout.mutate()}
                >
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          </div>
        </nav>
      </aside>

      <div className="min-w-0 md:col-start-2">
        <header className="flex h-14 items-center justify-between border-b border-line px-5 text-xs text-muted md:h-[68px] md:px-[42px]">
          <div className="flex items-center gap-2">
            Feed.io Studio
            {organization ? (
              <>
                <span className="text-[#c8c9c1]">/</span>
                <span className="font-semibold text-ink">
                  {organization.name}
                </span>
                {projectName ? (
                  <>
                    <span className="text-[#c8c9c1]">/</span>
                    <span className="text-ink">{projectName}</span>
                  </>
                ) : null}
              </>
            ) : null}
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell organizationId={organization?.id} />
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (
    parts
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "FI"
  );
}
