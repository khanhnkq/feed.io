import { Bell, Film, FolderKanban, MessageSquareText, Settings2, Users } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Avatar } from "@/components/ui/avatar";

const navigation = [
  { label: "Projects", href: "/projects", icon: FolderKanban, active: true },
  { label: "Reviews", href: "/reviews", icon: Film },
  { label: "Comments", href: "/comments", icon: MessageSquareText },
  { label: "Team", href: "/team", icon: Users },
];

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/projects" aria-label="Feed.io home">
          <span className="brand-mark">F</span>
          <span>feed.io</span>
        </Link>

        <nav className="primary-nav" aria-label="Workspace navigation">
          <p className="nav-label">Workspace</p>
          {navigation.map(({ label, href, icon: Icon, active }) => (
            <Link className={active ? "nav-link active" : "nav-link"} href={href} key={label}>
              <Icon aria-hidden size={18} strokeWidth={1.8} />
              {label}
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="nav-link" type="button">
            <Settings2 aria-hidden size={18} /> Settings
          </button>
          <div className="account-card">
            <Avatar initials="NK" tone="lime" />
            <span>
              <strong>NK Studio</strong>
              <small>Agency workspace</small>
            </span>
          </div>
        </div>
      </aside>

      <div className="content-column">
        <header className="topbar">
          <div>
            <span className="status-dot" />
            Self-hosted workspace
          </div>
          <button className="icon-button" type="button" aria-label="Notifications">
            <Bell size={19} />
            <span className="notification-badge">3</span>
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}
