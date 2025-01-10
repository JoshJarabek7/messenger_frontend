import { writable, type Subscriber, type Unsubscriber } from 'svelte/store';
import type { Workspace } from '$lib/types';

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
            const response = await fetch('http://localhost:8000/api/workspaces', {
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
        this.#state.workspaces = this.#state.workspaces.map(w => w.id === workspaceId ? workspace : w);
        this.#notify();
    }

    getWorkspace(workspaceId: string): Workspace | undefined {
        return this.#state.workspaces.find(w => w.id === workspaceId);
    }
}

export const workspaces = new WorkspacesStore(); 