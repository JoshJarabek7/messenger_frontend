import type { Conversation, Message, User } from '$lib/types';

export class ConversationAPI {
    static async getAll(workspaceId?: string): Promise<Conversation[]> {
        const url = workspaceId 
            ? `http://localhost:8000/api/conversations?workspace_id=${workspaceId}`
            : 'http://localhost:8000/api/conversations';
        
        const response = await fetch(url, {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to fetch conversations');
        }

        return response.json();
    }

    static async create(name: string, workspaceId?: string, isPrivate = false, participants?: string[]): Promise<Conversation> {
        const response = await fetch('http://localhost:8000/api/conversations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                name,
                workspace_id: workspaceId,
                is_private: isPrivate,
                participant_ids: participants
            })
        });

        if (!response.ok) {
            throw new Error('Failed to create conversation');
        }

        return response.json();
    }

    static async createDM(userId: string): Promise<Conversation> {
        const response = await fetch('http://localhost:8000/api/conversations', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                participant_id: userId,
                conversation_type: 'DIRECT'
            })
        });

        if (!response.ok) {
            throw new Error('Failed to create DM conversation');
        }

        return response.json();
    }

    static async getMessages(conversationId: string, before?: string, limit = 50): Promise<Message[]> {
        const params = new URLSearchParams();
        if (before) params.append('before', before);
        params.append('limit', limit.toString());

        const response = await fetch(`http://localhost:8000/api/messages/${conversationId}?${params}`, {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to fetch messages');
        }

        return response.json();
    }

    static async getMembers(conversationId: string): Promise<User[]> {
        const response = await fetch(`http://localhost:8000/api/conversations/${conversationId}/members`, {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to fetch members');
        }

        return response.json();
    }

    static async addMember(conversationId: string, userId: string): Promise<void> {
        const response = await fetch(`http://localhost:8000/api/conversations/${conversationId}/members`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ user_id: userId })
        });

        if (!response.ok) {
            throw new Error('Failed to add member');
        }
    }

    static async removeMember(conversationId: string, userId: string): Promise<void> {
        const response = await fetch(`http://localhost:8000/api/conversations/${conversationId}/members/${userId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to remove member');
        }
    }

    static async leave(conversationId: string): Promise<void> {
        const response = await fetch(`http://localhost:8000/api/conversations/${conversationId}/leave`, {
            method: 'POST',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to leave conversation');
        }
    }

    static async delete(conversationId: string): Promise<void> {
        const response = await fetch(`http://localhost:8000/api/conversations/${conversationId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to delete conversation');
        }
    }

    static async update(conversationId: string, updates: {
        name?: string;
        description?: string;
        is_private?: boolean;
    }): Promise<Conversation> {
        const response = await fetch(`http://localhost:8000/api/conversations/${conversationId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(updates)
        });

        if (!response.ok) {
            throw new Error('Failed to update conversation');
        }

        return response.json();
    }
} 