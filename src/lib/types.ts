export type ChatType = 'PUBLIC' | 'PRIVATE' | 'DIRECT';
export type FileType = 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'OTHER';

export interface User {
    id: string;
    email: string;
    username: string;
    display_name?: string;
    avatar_url?: string;
    is_online?: boolean;
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
}

export interface FileAttachment {
    id: string;
    original_filename: string;
    file_type: FileType;
    mime_type: string;
    file_size: number;
    uploaded_at: string;
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
}

export interface Workspace {
    id: string;
    name: string;
    description?: string;
    icon_url?: string;
    slug: string;
    created_at: string;
    created_by_id: string;
    member_count?: number;
    is_member?: boolean;
}

export interface ChannelMember {
    user: User;
    is_admin: boolean;
    joined_at: string;
}

export interface AuthResponse {
    user: User;
} 