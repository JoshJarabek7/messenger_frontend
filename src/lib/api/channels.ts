import type { Channel } from '$lib/types';

export class ChannelAPI {
    static async create(workspaceId: string, name: string, description?: string): Promise<Channel> {
        const response = await fetch(`http://localhost:8000/api/channels`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                workspace_id: workspaceId,
                name,
                description
            }),
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to create channel');
        }

        return response.json();
    }

    static async delete(channelId: string): Promise<void> {
        const response = await fetch(`http://localhost:8000/api/channels/${channelId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to delete channel');
        }
    }
} 