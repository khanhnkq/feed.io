export type NotificationType =
  | "mention"
  | "comment_reply"
  | "review_decision"
  | "project_invitation"
  | "project_access_granted"
  | "organization_invited"
  | "role_updated"
  | "media_ready"
  | "media_failed"
  | "system";

export interface NotificationRecord {
  id: string;
  user_id: string;
  organization_id: string;
  actor_id?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  link_url: string;
  metadata_json?: Record<string, unknown>;
  read_at?: string | null;
  is_read: boolean;
  created_at: string;
}

export type NotificationItemData = NotificationRecord;

export interface PaginatedNotifications {
  items: NotificationRecord[];
  total_unread: number;
  next_cursor?: string | null;
}

export interface UnreadCountResponse {
  unread_count: number;
}
