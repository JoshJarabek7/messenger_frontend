import { API_BASE_URL } from '$lib/config.ts';

export class WorkspaceAPI {
    static async leave(workspaceId: string): Promise<void> {
        const response = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/leave`, {
            method: 'POST',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to leave workspace');
        }
    }
}