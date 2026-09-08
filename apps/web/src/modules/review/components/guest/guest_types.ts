export interface ShareDetails {
  media_id: string;
  title: string;
  filename: string;
  duration_seconds: number | null;
  fps: number | null;
  width: number | null;
  height: number | null;
  mime_type: string;
  review_status: string;
  has_passphrase: boolean;
  is_authenticated: boolean;
  allow_comments: boolean;
  allow_approval: boolean;
  allow_download: boolean;
  thumbnail_url: string | null;
  waveform_data: string | null;
}

export interface StreamDetails {
  stream_url: string;
  hls_url: string | null;
  duration_seconds: number | null;
  fps: number | null;
}

export interface CommentAuthor {
  id?: string;
  name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
}

export interface GuestAnnotationData {
  type?: string;
  points?: number[];
  color?: string;
  strokeWidth?: number;
}

export interface PublicComment {
  id: string;
  content: string;
  timestamp_seconds: number | null;
  frame_number: number | null;
  annotation_data: GuestAnnotationData | null;
  created_at: string;
  author?: CommentAuthor;
  replies?: PublicComment[];
}
