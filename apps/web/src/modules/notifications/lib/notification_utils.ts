import {
  AtSign,
  Bell,
  CheckCircle2,
  MessageSquareReply,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import type { NotificationType } from "../types";

export function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 60) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return dateString;
  }
}

export interface NotificationTypeMeta {
  icon: LucideIcon;
  label: string;
  badgeTone: "violet" | "blue" | "emerald" | "amber" | "neutral";
  bgClass: string;
  textClass: string;
}

export function getNotificationTypeMeta(type: NotificationType): NotificationTypeMeta {
  switch (type) {
    case "mention":
      return {
        icon: AtSign,
        label: "Mention",
        badgeTone: "violet",
        bgClass: "bg-violet-500/10 border-violet-500/20",
        textClass: "text-violet-400",
      };
    case "comment_reply":
      return {
        icon: MessageSquareReply,
        label: "Reply",
        badgeTone: "blue",
        bgClass: "bg-blue-500/10 border-blue-500/20",
        textClass: "text-blue-400",
      };
    case "review_decision":
      return {
        icon: CheckCircle2,
        label: "Decision",
        badgeTone: "emerald",
        bgClass: "bg-emerald-500/10 border-emerald-500/20",
        textClass: "text-emerald-400",
      };
    case "project_invitation":
      return {
        icon: UserPlus,
        label: "Invite",
        badgeTone: "amber",
        bgClass: "bg-amber-500/10 border-amber-500/20",
        textClass: "text-amber-400",
      };
    case "system":
    default:
      return {
        icon: Bell,
        label: "System",
        badgeTone: "neutral",
        bgClass: "bg-ink/5 border-line",
        textClass: "text-muted",
      };
  }
}
