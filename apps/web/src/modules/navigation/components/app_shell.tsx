"use client";

import {
  getGetCurrentUserQueryKey,
  type CurrentUserResponse,
  type OrganizationResponse,
  useLogout,
} from "@feedio/api-client";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Bell,
  Building2,
  Film,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  Settings2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { Avatar } from "@/components/ui/avatar";

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
        await queryClient.resetQueries({ queryKey: getGetCurrentUserQueryKey() });
      },
    },
  });
  const initials = getInitials(user.display_name);

  interface NavigationItem {
    label: string;
    href: string;
    icon: typeof LayoutDashboard;
    available: boolean;
    exact?: boolean;
  }

  const globalNavigation: NavigationItem[] = [
    { label: "Organizations", href: "/app", icon: Building2, available: true, exact: true },
    { label: "Activity", href: "/app/activity", icon: Users, available: false },
    { label: "Invitations", href: "/app/invitations", icon: Bell, available: false },
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
      icon: FolderKanban,
      available: true,
      exact: false,
    },
    { label: "Reviews", href: `/app/organizations/${orgSlug}/reviews`, icon: Film, available: false },
    { label: "Comments", href: `/app/organizations/${orgSlug}/comments`, icon: MessageSquareText, available: false },
    { label: "Team", href: `/app/organizations/${orgSlug}/team`, icon: Users, available: false },
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
      label: "Reviews",
      href: `/app/organizations/${orgSlug}/projects/${currentProjectId}/reviews`,
      icon: MessageSquareText,
      available: false,
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
      <aside className="relative z-10 flex h-[62px] w-full items-center border-r border-[#282b24] bg-[#161813] px-[18px] text-[#f8f8f1] md:fixed md:inset-y-0 md:left-0 md:h-auto md:w-60 md:flex-col md:items-stretch md:px-[18px] md:pb-[18px] md:pt-[26px]">
        <Link
          className="flex items-center gap-3 px-2.5 text-xl font-extrabold tracking-[-.04em] focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-focus"
          href="/app"
          aria-label="Feed.io home"
        >
          <span className="grid size-[30px] place-items-center rounded-[8px_3px_8px_3px] bg-lime font-black text-ink">
            F
          </span>
          <span>feed.io</span>
        </Link>

        {context === "project" ? (
          <div className="mt-6 hidden md:block">
            <Link
              href={`/app/organizations/${orgSlug}/projects`}
              className="flex items-center gap-2 px-3 py-1.5 text-xs text-[#8b8e83] transition hover:text-white"
            >
              <ArrowLeft size={14} /> All projects
            </Link>
          </div>
        ) : context === "organization" ? (
          <div className="mt-6 hidden md:block">
            <Link
              href="/app"
              className="flex items-center gap-2 px-3 py-1.5 text-xs text-[#8b8e83] transition hover:text-white"
            >
              <ArrowLeft size={14} /> All organizations
            </Link>
          </div>
        ) : null}

        <nav className="mt-8 hidden md:block" aria-label="Main navigation">
          <p className="mb-3 px-3 text-[11px] font-extrabold uppercase tracking-[.13em] text-[#8b8e83]">
            {context === "project"
              ? projectName || "Project"
              : context === "organization" && organization
                ? organization.name
                : "Global"}
          </p>
          {navItems.map(({ label, href, icon: Icon, available, exact }) => {
            const isActive = exact ? pathname === href : pathname.startsWith(href);
            return available ? (
              <Link
                className={`${navClass} ${isActive ? "bg-[#272a22] text-white after:ml-auto after:size-1.5 after:rounded-full after:bg-lime after:content-['']" : ""}`}
                href={href}
                key={label}
              >
                <Icon aria-hidden size={18} strokeWidth={1.8} />
                {label}
              </Link>
            ) : (
              <span className={`${navClass} cursor-not-allowed opacity-50`} key={label} aria-disabled="true">
                <Icon aria-hidden size={18} strokeWidth={1.8} />
                {label}
                <small className="ml-auto font-mono text-[8px] font-bold uppercase tracking-[.08em] text-[#777b70]">
                  Soon
                </small>
              </span>
            );
          })}
        </nav>

        <div className="ml-auto md:mt-auto">
          <button
            className={`${navClass} hidden disabled:cursor-not-allowed disabled:opacity-50 md:flex`}
            type="button"
            disabled
            title="Settings will be available in a later slice"
          >
            <Settings2 aria-hidden size={18} /> Settings
          </button>
          <div className="flex items-center gap-2.5 md:mt-3 md:border-t md:border-[#30332b] md:px-1 md:pb-0.5 md:pt-[13px]">
            <Avatar initials={initials} tone="lime" />
            <span className="hidden min-w-0 flex-1 md:grid md:gap-0.5">
              <strong className="overflow-hidden text-ellipsis whitespace-nowrap text-xs">{user.display_name}</strong>
              <small className="overflow-hidden text-ellipsis whitespace-nowrap text-[9px] text-[#85887d]">
                {user.email}
              </small>
            </span>
            <button
              className="grid size-8 shrink-0 place-items-center rounded-md border-0 bg-transparent text-[#8b8e83] hover:bg-[#292c25] hover:text-white disabled:cursor-wait disabled:opacity-50"
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
      </aside>

      <div className="min-w-0 md:col-start-2">
        <header className="flex h-14 items-center justify-between border-b border-line px-5 text-xs text-muted md:h-[68px] md:px-[42px]">
          <div className="flex items-center gap-2">
            <span className="size-[7px] rounded-full bg-[#4ecb71] shadow-[0_0_0_4px_#dff4e4]" />
            Self-hosted platform
            {organization ? (
              <>
                <span className="text-[#c8c9c1]">/</span>
                <span className="font-semibold text-ink">{organization.name}</span>
                {projectName ? (
                  <>
                    <span className="text-[#c8c9c1]">/</span>
                    <span className="text-ink">{projectName}</span>
                  </>
                ) : null}
              </>
            ) : null}
          </div>
          <button
            className="relative grid size-11 place-items-center border-0 bg-transparent text-ink focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus"
            type="button"
            aria-label="Notifications"
          >
            <Bell size={19} />
            <span className="absolute right-0 top-0 grid size-4 place-items-center rounded-full bg-lime text-[9px] font-extrabold">
              3
            </span>
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "FI";
}
