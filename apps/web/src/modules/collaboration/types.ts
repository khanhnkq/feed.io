export interface PresenceUser {
  user_id: string;
  name: string;
  email?: string | null;
  avatar_url?: string | null;
  joined_at: string;
}

export interface RealtimeEvent<T = Record<string, unknown>> {
  id: string;
  event_type: string;
  room: string;
  payload: T;
  created_at: string;
}

export interface RealtimeCommentCreatedPayload {
  comment: {
    id: string;
    organization_id: string;
    project_id: string;
    media_id: string;
    user_id: string;
    parent_comment_id: string | null;
    timestamp_seconds: number | null;
    frame_number: number | null;
    content: string;
    annotation_data: Record<string, unknown> | null;
    status: "open" | "resolved";
    created_at: string;
    updated_at: string;
    author: {
      id: string;
      name: string;
      email?: string | null;
      avatar_url?: string | null;
    };
    replies?: unknown[];
  };
}

export interface RealtimeCommentDeletedPayload {
  comment_id: string;
  media_id: string;
}

export interface RealtimePresenceSyncPayload {
  users: PresenceUser[];
}

export interface RealtimePresenceJoinPayload {
  user: PresenceUser;
}

export interface RealtimePresenceLeftPayload {
  user_id: string;
}

export interface RealtimeDecisionUpdatedPayload {
  media_id: string;
  status: string;
  notes?: string | null;
  user_id: string;
  user_name?: string | null;
  created_at: string;
}

export interface RealtimeMediaCreatedPayload {
  media: Record<string, unknown>;
  project_id: string;
  folder_id?: string | null;
}

export interface RealtimeMediaUpdatedPayload {
  media: Record<string, unknown>;
  project_id: string;
}

export interface RealtimeMediaMovedPayload {
  media: Record<string, unknown>;
  project_id: string;
  folder_id?: string | null;
}

export interface RealtimeMediaDeletedPayload {
  media_id: string;
  project_id: string;
}

export interface RealtimeMediaTranscodedPayload {
  media_id: string;
  project_id: string;
  status: "ready" | "failed" | string;
  hls_master_playlist_url?: string | null;
  thumbnail_url?: string | null;
  duration_seconds?: number | null;
  width?: number | null;
  height?: number | null;
  error?: string | null;
}

export interface RealtimeFolderCreatedPayload {
  folder: Record<string, unknown>;
  project_id: string;
  parent_id?: string | null;
}

export interface RealtimeFolderUpdatedPayload {
  folder: Record<string, unknown>;
  folder_id: string;
  name: string;
  project_id: string;
}

export interface RealtimeFolderMovedPayload {
  folder: Record<string, unknown>;
  folder_id: string;
  target_parent_id?: string | null;
  project_id: string;
}

export interface RealtimeFolderDeletedPayload {
  folder_id: string;
  project_id: string;
}

export interface RealtimeProjectMembersUpdatedPayload {
  project_id: string;
  user_id: string;
  role?: string | null;
  action: "added" | "updated" | "removed" | string;
}

export interface RealtimeOrganizationMembersUpdatedPayload {
  organization_id: string;
  user_id: string;
  role?: string | null;
  action: "updated" | "removed" | string;
}

export interface RealtimeSessionRevokedPayload {
  user_id: string;
  session_id?: string | null;
  revoked_all?: boolean;
  reason?: string | null;
}

export interface RealtimeProjectUpdatedPayload {
  project: Record<string, unknown>;
  project_id: string;
  organization_id: string;
}

export interface RealtimeProjectDeletedPayload {
  project_id: string;
  organization_id: string;
}
