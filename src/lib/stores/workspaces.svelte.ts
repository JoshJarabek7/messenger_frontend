import { writable, type Subscriber, type Unsubscriber } from 'svelte/store';
import type { Workspace } from '$lib/types';
import { API_BASE_URL } from '$lib/config.ts';
interface WorkspacesState {
    workspaces: Workspace[];
    error: string | null;
    isLoading: boolean;
}

class WorkspacesStore {
    #state = $state<WorkspacesState>({
        workspaces: [],
        error: null,
        isLoading: false
    });

    #subscribers = new Set<Subscriber<WorkspacesState>>();

    subscribe(run: Subscriber<WorkspacesState>): Unsubscriber {
        this.#subscribers.add(run);
        run(this.#state);

        return () => {
            this.#subscribers.delete(run);
        };
    }

    #notify() {
        for (const subscriber of this.#subscribers) {
            subscriber(this.#state);
        }
    }

    get state() {
        return this.#state;
    }

    async loadWorkspaces(): Promise<void> {
        this.#state.isLoading = true;
        this.#notify();

        try {
            const response = await fetch('${API_BASE_URL}/workspaces', {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to fetch workspaces');
            }

            const workspaces = await response.json();
            this.#state.workspaces = workspaces;
        } catch (error) {
            console.error('Error loading workspaces:', error);
            this.#state.error = error instanceof Error ? error.message : 'Failed to load workspaces';
        } finally {
            this.#state.isLoading = false;
            this.#notify();
        }
    }

    addWorkspace(workspace: Workspace): void {
        this.#state.workspaces = [...this.#state.workspaces, workspace];
        this.#notify();
    }

    removeWorkspace(workspaceId: string): void {
        this.#state.workspaces = this.#state.workspaces.filter(w => w.id !== workspaceId);
        this.#notify();
    }

    updateWorkspace(workspaceId: string, workspace: Workspace): void {
        console.log('🔍 Updating workspace in store:', {
            workspaceId,
            workspace,
            currentWorkspaces: this.#state.workspaces.length,
            currentMemberCount: this.#state.workspaces.find(w => w.id === workspaceId)?.member_count,
            newMemberCount: workspace.member_count
        });

        const index = this.#state.workspaces.findIndex(w => w.id === workspaceId);
        if (index !== -1) {
            // Create a new array to ensure reactivity
            const updatedWorkspaces = [...this.#state.workspaces];
            updatedWorkspaces[index] = workspace;
            this.#state = {
                ...this.#state,
                workspaces: updatedWorkspaces
            };
            console.log('Workspace updated, new state:', {
                workspaceCount: this.#state.workspaces.length,
                updatedWorkspace: workspace
            });
            this.#notify();
        } else {
            console.log('Workspace not found for update:', workspaceId);
        }
    }

    getWorkspace(workspaceId: string): Workspace | undefined {
        return this.#state.workspaces.find(w => w.id === workspaceId);
    }
}

export const workspaces = new WorkspacesStore(); 