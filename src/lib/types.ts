export type ChatType = 'PUBLIC' | 'PRIVATE' | 'DIRECT';
export type FileType = 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'OTHER';

export interface User {
    id: string;
    email: string;
    username: string;
    display_name?: string | null;
    avatar_url?: string | null;
    is_online?: boolean;
    last_active?: string | null;
}

export interface Message {
    id: string;
    content: string;
    conversation_id: string;
    parent_id?: string;
    created_at: string;
    updated_at: string;
    user: User;
    attachments: FileAttachment[];
    reactions: Reaction[];
    reply_count: number;
    replies?: Message[];
}

export interface FileAttachment {
    id: string;
    original_filename: string;
    file_type: string;
    mime_type: string;
    file_size: number;
    uploaded_at: string;
    download_url: string;
}

export interface Reaction {
    id: string;
    emoji: string;
    user: User;
}

export interface Conversation {
    id: string;
    name?: string;
    description?: string;
    conversation_type: ChatType;
    workspace_id?: string;
    participant_1?: User;
    participant_2?: User;
    last_message?: Message;
    created_at: string;
    updated_at: string;
    is_temporary?: boolean;
}

export interface Workspace {
    id: string;
    name: string;
    description?: string;
    slug: string;
    icon_url?: string;
    created_at: string;
    created_by_id: string;
    is_member?: boolean;
    member_count?: number;
}

export interface ChannelMember {
    user: User;
    is_admin: boolean;
    joined_at: string;
}

export interface WorkspaceMember extends User {
    role: 'owner' | 'admin' | 'member';
}

export interface AuthResponse {
    user: User;
}

export interface Channel {
    id: string;
    name: string;
    description?: string;
    workspace_id: string;
    is_private: boolean;
    created_at: string;
} 