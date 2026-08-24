export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Profile = {
  id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  role: "admin" | "user";
  is_blocked: boolean;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
};

export type Folder = {
  id: string;
  owner_id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
};

export type MapNodeData = {
  label: string;
  color: string;
  icon?: string;
  notes?: string;
};

export type MindMapContent = {
  nodes: Array<{
    id: string;
    type?: string;
    position: { x: number; y: number };
    data: MapNodeData;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    type?: string;
  }>;
  viewport?: { x: number; y: number; zoom: number };
};

export type MindMap = {
  id: string;
  owner_id: string;
  folder_id: string | null;
  title: string;
  content: MindMapContent;
  visibility: "private" | "public" | "unlisted";
  share_token: string;
  thumbnail_url: string | null;
  created_at: string;
  updated_at: string;
};

export type Post = {
  id: string;
  author_id: string;
  type: "pdf" | "ebook" | "article" | "link" | "image" | "map";
  title: string;
  description: string | null;
  file_url: string | null;
  file_path: string | null;
  file_mime: string | null;
  file_size: number | null;
  link_url: string | null;
  mind_map_id: string | null;
  download_count: number;
  created_at: string;
  updated_at: string;
  author?: Profile;
  mind_map?: Pick<MindMap, "id" | "title" | "share_token" | "visibility"> | null;
  like_count?: number;
  comment_count?: number;
  liked_by_me?: boolean;
};

export type Comment = {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  created_at: string;
  author?: Profile;
  replies?: Comment[];
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
};

export type Conversation = {
  id: string;
  participant_a: string;
  participant_b: string;
  last_message_at: string;
  created_at: string;
  other?: Profile;
  last_message?: Message | null;
  unread?: number;
};

export type Notification = {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: "like" | "comment" | "follow" | "message" | "mention" | "report";
  post_id: string | null;
  comment_id: string | null;
  payload: Json;
  read_at: string | null;
  created_at: string;
  actor?: Profile | null;
};

export type Report = {
  id: string;
  reporter_id: string;
  target_type: "post" | "comment" | "file" | "user" | "map";
  target_id: string;
  reason: string;
  details: string | null;
  status: "open" | "reviewed" | "dismissed" | "removed";
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
};

export type AdminMetrics = {
  users_total: number;
  users_blocked: number;
  users_active_30d: number;
  posts_total: number;
  posts_month: number;
  maps_total: number;
  downloads_total: number;
  ai_used_month: number;
  reports_open: number;
  comments_total: number;
};
