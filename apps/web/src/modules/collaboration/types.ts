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
