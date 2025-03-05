// Application-specific types for use in components

export interface Organization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  avatar_url?: string;
  owner_id: string;
  isMember?: boolean;
  similarity?: number;
  similarityPercent?: string;
  created_at?: string;
  updated_at?: string;
}

export interface User {
  id: string;
  username: string;
  display_name?: string;
  email: string;
  bio?: string;
  ai_persona_prompt?: string;
  avatar_url?: string;
  status?: 'online' | 'offline' | 'away';
  last_seen?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Channel {
  id: string;
  name: string;
  slug: string;
  description?: string;
  is_public: boolean;
  organization_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface Message {
  id: string;
  content: string;
  created_at: string;
  updated_at?: string;
  is_ai_generated: boolean;
  sender_id: string;
  parent_message_id?: string;
  channel_id?: string;
  conversation_id?: string;
  sender?: User;
  reactions: Reaction[];
  file_attachments: FileAttachment[];
  reply_count?: number;
}

export interface Reaction {
  id: string;
  emoji: string;
  user_id: string;
  message_id: string;
  created_at: string;
}

export interface FileAttachment {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  file_type: string;
  message_id: string;
  created_at: string;
}

export interface Participant {
  user: User;
  conversation_id?: string;
}

export interface ChannelMember {
  id: string;
  username: string;
  email?: string;
  display_name?: string;
  avatar_url?: string;
  role: string; // "owner", "admin", "member"
}
