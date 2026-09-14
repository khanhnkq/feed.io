import {
  AlertTriangle,
  AtSign,
  Bell,
  CheckCircle2,
  MessageSquareReply,
  Shield,
  UserCheck,
  UserPlus,
  Video,
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
  badgeTone: "violet" | "blue" | "emerald" | "amber" | "rose" | "neutral";
  bgClass: string;
  textClass: string;
}

export function getNotificationTypeMeta(type: NotificationType): NotificationTypeMeta {
  switch (type) {
    case "mention":
      return {
        icon: AtSign,
        label: "Mention",
        badgeTone: "neutral",
        bgClass: "bg-surface border-line",
        textClass: "text-ink",
      };
    case "comment_reply":
      return {
        icon: MessageSquareReply,
        label: "Reply",
        badgeTone: "neutral",
        bgClass: "bg-surface border-line",
        textClass: "text-ink",
      };
    case "review_decision":
      return {
        icon: CheckCircle2,
        label: "Decision",
        badgeTone: "neutral",
        bgClass: "bg-surface border-line",
        textClass: "text-ink",
      };
    case "project_invitation":
      return {
        icon: UserPlus,
        label: "Invite",
        badgeTone: "neutral",
        bgClass: "bg-surface border-line",
        textClass: "text-ink",
      };
    case "project_access_granted":
      return {
        icon: UserCheck,
        label: "Project Access",
        badgeTone: "neutral",
        bgClass: "bg-surface border-line",
        textClass: "text-ink",
      };
    case "organization_invited":
      return {
        icon: UserPlus,
        label: "Org Invitation",
        badgeTone: "neutral",
        bgClass: "bg-surface border-line",
        textClass: "text-ink",
      };
    case "role_updated":
      return {
        icon: Shield,
        label: "Role Changed",
        badgeTone: "neutral",
        bgClass: "bg-surface border-line",
        textClass: "text-ink",
      };
    case "media_ready":
      return {
        icon: Video,
        label: "Transcoding Ready",
        badgeTone: "neutral",
        bgClass: "bg-surface border-line",
        textClass: "text-ink",
      };
    case "media_failed":
      return {
        icon: AlertTriangle,
        label: "Transcode Failed",
        badgeTone: "rose",
        bgClass: "bg-red-500/10 border-red-500/20",
        textClass: "text-red-600",
      };
    case "system":
    default:
      return {
        icon: Bell,
        label: "System",
        badgeTone: "neutral",
        bgClass: "bg-surface border-line",
        textClass: "text-ink",
      };
  }
}

