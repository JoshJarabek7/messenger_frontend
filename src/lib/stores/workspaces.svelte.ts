import { writable } from 'svelte/store';
import type { Workspace } from '$lib/types';
import { toast } from 'svelte-sonner';

interface WorkspacesState {
    workspaces: Workspace[];
    isLoading: boolean;
}

function createWorkspacesStore() {
    const { subscribe, set, update } = writable<WorkspacesState>({
        workspaces: [],
        isLoading: false
    });

    return {
        subscribe,
        loadWorkspaces: async () => {
            update((state) => ({ ...state, isLoading: true }));
            try {
                const response = await fetch('http://localhost:8000/api/workspaces', {
                    credentials: 'include'
                });
                if (!response.ok) throw new Error('Failed to fetch workspaces');
                const workspaces = await response.json();
                update((state) => ({ ...state, workspaces, isLoading: false }));
            } catch (error) {
                console.error('Error loading workspaces:', error);
                toast.error('Failed to load workspaces');
                update((state) => ({ ...state, workspaces: [], isLoading: false }));
            }
        },
        addWorkspace: (workspace: Workspace) => {
            update((state) => ({
                ...state,
                workspaces: [...state.workspaces, workspace]
            }));
        },
        removeWorkspace: (workspaceId: string) => {
            update((state) => ({
                ...state,
                workspaces: state.workspaces.filter((w) => w.id !== workspaceId)
            }));
        },
        updateWorkspace: (workspaceId: string, workspace: Workspace) => {
            update((state) => ({
                ...state,
                workspaces: state.workspaces.map((w) => (w.id === workspaceId ? workspace : w))
            }));
        }
    };
}

export const workspaces = createWorkspacesStore(); 