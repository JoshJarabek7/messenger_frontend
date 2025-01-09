import type { Message } from '$lib/types';

export class MessageAPI {
    static async getMessages(conversationId: string, page: number, pageSize: number): Promise<Message[]> {
        console.log(`Fetching messages for conversation ${conversationId}, page ${page}, size ${pageSize}`);
        const response = await fetch(
            `http://localhost:8000/api/messages/${conversationId}?page=${page}&limit=${pageSize}`,
            {
                credentials: 'include'
            }
        );

        if (!response.ok) {
            const error = await response.text();
            console.error('Failed to fetch messages:', error);
            throw new Error('Failed to fetch messages');
        }

        const messages = await response.json();
        console.log(`Received ${messages.length} messages`);
        return messages;
    }

    static async sendMessage(conversationId: string, content: string, fileIds?: string[]): Promise<Message> {
        const response = await fetch(`http://localhost:8000/api/messages/${conversationId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                content,
                file_ids: fileIds
            }),
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to send message');
        }

        return response.json();
    }

    static async addReaction(messageId: string, emoji: string): Promise<Message> {
        const response = await fetch(`http://localhost:8000/api/messages/${messageId}/reactions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ emoji }),
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to add reaction');
        }

        return response.json();
    }

    static async removeReaction(messageId: string, reactionId: string): Promise<Message> {
        const response = await fetch(
            `http://localhost:8000/api/messages/${messageId}/reactions/${reactionId}`,
            {
                method: 'DELETE',
                credentials: 'include'
            }
        );

        if (!response.ok) {
            throw new Error('Failed to remove reaction');
        }

        return response.json();
    }

    static async reply(messageId: string, content: string): Promise<Message> {
        const response = await fetch(`http://localhost:8000/api/messages/${messageId}/reply`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content }),
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to send reply');
        }

        return response.json();
    }

    static async getThread(messageId: string): Promise<Message[]> {
        const response = await fetch(`http://localhost:8000/api/messages/${messageId}/thread`, {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to fetch thread');
        }

        return response.json();
    }
} 