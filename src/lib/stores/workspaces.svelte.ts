import { writable } from 'svelte/store';

interface Workspace {
    id: string;
    name: string;
    icon_url?: string;
    slug: string;
}

function createWorkspacesStore() {
    const { subscribe, set, update } = writable<Workspace[]>([]);

    return {
        subscribe,
        set,
        refresh: async () => {
            try {
                const response = await fetch('http://localhost:8000/api/workspaces', {
                    credentials: 'include'
                });
                
                if (!response.ok) {
                    throw new Error('Failed to fetch workspaces');
                }
                
                const workspaces = await response.json();
                set(workspaces);
                return workspaces;
            } catch (error) {
                console.error('Failed to fetch workspaces:', error);
                return [];
            }
        }
    };
}

export const workspaces = createWorkspacesStore(); 