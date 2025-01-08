import type { ChatType, Message } from '$lib/types';

export class MessageAPI {

    static async send(conversationId: string, conversationType: ChatType, content: string, files?: string[]): Promise<Message> {
        const response = await fetch(`http://localhost:8000/api/messages/${conversationId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                content,
                file_ids: files
            })
        });

        if (!response.ok) {
            throw new Error('Failed to send message');
        }

        return response.json();
    }

    static async delete(messageId: string): Promise<void> {
        const response = await fetch(`http://localhost:8000/api/messages/${messageId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to delete message');
        }
    }

    static async edit(messageId: string, content: string): Promise<Message> {
        const response = await fetch(`http://localhost:8000/api/messages/${messageId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ content })
        });

        if (!response.ok) {
            throw new Error('Failed to edit message');
        }

        return response.json();
    }

    static async addReaction(messageId: string, emoji: string): Promise<Message> {
        const response = await fetch(`http://localhost:8000/api/messages/${messageId}/reactions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ emoji })
        });

        if (!response.ok) {
            throw new Error('Failed to add reaction');
        }

        return response.json();
    }

    static async removeReaction(messageId: string, reactionId: string): Promise<Message> {
        const response = await fetch(`http://localhost:8000/api/messages/${messageId}/reactions/${reactionId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to remove reaction');
        }

        return response.json();
    }

    static async getThread(messageId: string): Promise<Message[]> {
        const response = await fetch(`http://localhost:8000/api/messages/${messageId}/thread`, {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to get thread');
        }

        return response.json();
    }

    static async reply(messageId: string, content: string, files?: string[]): Promise<Message> {
        const response = await fetch(`http://localhost:8000/api/messages/${messageId}/reply`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                content,
                file_ids: files
            })
        });

        if (!response.ok) {
            throw new Error('Failed to reply to message');
        }

        return response.json();
    }
} 