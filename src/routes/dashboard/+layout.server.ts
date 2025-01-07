import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ fetch, locals }) => {
    try {
        // Fetch workspaces for the current user
        const workspacesResponse = await fetch('http://localhost:8000/api/workspaces', {
            credentials: 'include'
        });
        const workspaces = await workspacesResponse.json();

        // Fetch recent DM conversations
        const recentDmsResponse = await fetch('http://localhost:8000/api/messages/recent-dms?limit=10', {
            credentials: 'include'
        });
        const recentDms = await recentDmsResponse.json();

        const userResponse = await fetch('http://localhost:8000/api/auth/verify', {
            credentials: 'include'
        });
        const user = await userResponse.json();

        return {
            workspaces,
            recentDms,
            user,
            // We'll fetch channels client-side when a workspace is selected
            activeWorkspaceId: null
        };
    } catch (error) {
        console.error('Failed to load dashboard data:', error);
        return {
            workspaces: [],
            recentDms: [],
            user: null,
            activeWorkspaceId: null
        };
    }
}; 