import { writable, type Subscriber, type Unsubscriber } from 'svelte/store';
import type { Channel, Workspace } from '$lib/types';
import { toast } from 'svelte-sonner';
import { workspaces } from './workspaces.svelte';
import { users } from './users.svelte';

interface WorkspaceState {
    activeWorkspace: Workspace | null;
    activeChannel: Channel | null;
    members: any[];
    files: any[];
    channels: Channel[];
    error: string | null;
    isLoading: boolean;
}

class WorkspaceStore {
    #state = $state<WorkspaceState>({
        activeWorkspace: null,
        activeChannel: null,
        members: [],
        files: [],
        channels: [],
        error: null,
        isLoading: false
    });

    // Cache for workspace data
    #workspaceCache: {
        [key: string]: {
            members?: any[];
            files?: any[];
            channels?: Channel[];
        };
    } = {};

    #subscribers = new Set<Subscriber<WorkspaceState>>();

    subscribe(run: Subscriber<WorkspaceState>): Unsubscriber {
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

    setMembers(workspaceId: string, memberData: any): void {
        if (!this.#workspaceCache[workspaceId]) {
            this.#workspaceCache[workspaceId] = {};
        }

        // Convert member data to array format with roles and update users store
        const members = [
            ...memberData.owner_ids.map((id: string) => {
                const user = memberData.users[id];
                users.updateUser(user);
                return {
                    ...user,
                    role: 'owner' as const
                };
            }),
            ...memberData.admin_ids.map((id: string) => {
                const user = memberData.users[id];
                users.updateUser(user);
                return {
                    ...user,
                    role: 'admin' as const
                };
            }),
            ...memberData.member_ids.map((id: string) => {
                const user = memberData.users[id];
                users.updateUser(user);
                return {
                    ...user,
                    role: 'member' as const
                };
            })
        ];

        this.#workspaceCache[workspaceId].members = members;
        if (this.#state.activeWorkspace?.id === workspaceId) {
            this.#state.members = members;
            this.#notify();
        }
    }

    setFiles(workspaceId: string, files: any[]): void {
        if (!this.#workspaceCache[workspaceId]) {
            this.#workspaceCache[workspaceId] = {};
        }
        this.#workspaceCache[workspaceId].files = files;
        if (this.#state.activeWorkspace?.id === workspaceId) {
            this.#state.files = files;
            this.#notify();
        }
    }

    setChannels(workspaceId: string, channels: Channel[]): void {
        if (!this.#workspaceCache[workspaceId]) {
            this.#workspaceCache[workspaceId] = {};
        }
        this.#workspaceCache[workspaceId].channels = channels;
        if (this.#state.activeWorkspace?.id === workspaceId) {
            this.#state.channels = channels;
            this.#notify();
        }
    }

    getWorkspaceData(workspaceId: string): {
        members?: any[];
        files?: any[];
        channels?: Channel[];
    } {
        return this.#workspaceCache[workspaceId] || {};
    }

    async selectWorkspace(workspaceId: string | null): Promise<void> {
        if (!workspaceId) {
            this.setActiveWorkspace(null);
            this.setActiveChannel(null);
            return;
        }

        this.#state.isLoading = true;
        this.#notify();

        try {
            // Clear active channel when switching workspaces
            this.setActiveChannel(null);

            // Get workspace details from workspaces store
            const workspaceDetails = workspaces.getWorkspace(workspaceId);
            if (!workspaceDetails) {
                throw new Error('Workspace not found');
            }

            // Set active workspace with cached data
            this.setActiveWorkspace(workspaceDetails);

            // If we don't have cached data for this workspace, fetch it
            if (!this.#workspaceCache[workspaceId]) {
                const [channelsResponse, membersResponse, filesResponse] = await Promise.all([
                    fetch(`http://localhost:8000/api/workspaces/${workspaceId}/channels`, {
                        credentials: 'include'
                    }),
                    fetch(`http://localhost:8000/api/workspaces/${workspaceId}/members`, {
                        credentials: 'include'
                    }),
                    fetch(`http://localhost:8000/api/workspaces/${workspaceId}/files`, {
                        credentials: 'include'
                    })
                ]);

                if (!channelsResponse.ok || !membersResponse.ok || !filesResponse.ok) {
                    throw new Error('Failed to fetch workspace data');
                }

                const [channels, members, files] = await Promise.all([
                    channelsResponse.json(),
                    membersResponse.json(),
                    filesResponse.json()
                ]);

                // Update cache and current state
                this.setMembers(workspaceId, members);
                this.setFiles(workspaceId, files);
                this.setChannels(workspaceId, channels);
            }
        } catch (error) {
            console.error('Error selecting workspace:', error);
            this.#state.error = error instanceof Error ? error.message : 'Failed to select workspace';
            toast.error(this.#state.error);
        } finally {
            this.#state.isLoading = false;
            this.#notify();
        }
    }

    setActiveWorkspace(workspace: Workspace | null): void {
        this.#state.activeWorkspace = workspace;
        this.#state.activeChannel = null;  // Clear active channel when workspace changes
        if (workspace) {
            const cachedData = this.#workspaceCache[workspace.id];
            if (cachedData) {
                if (cachedData.members) this.#state.members = cachedData.members;
                if (cachedData.files) this.#state.files = cachedData.files;
                if (cachedData.channels) this.#state.channels = cachedData.channels;
            } else {
                // Reset state if no cached data
                this.#state.members = [];
                this.#state.files = [];
                this.#state.channels = [];
            }
        } else {
            this.#state.members = [];
            this.#state.files = [];
            this.#state.channels = [];
        }
        this.#notify();
    }

    addChannel(channel: Channel): void {
        if (!this.#state.activeWorkspace) return;

        // Update cache
        const workspaceId = this.#state.activeWorkspace.id;
        if (this.#workspaceCache[workspaceId]) {
            this.#workspaceCache[workspaceId].channels = [
                ...(this.#workspaceCache[workspaceId].channels || []),
                channel
            ];
        }

        // Update current state if this is for the active workspace
        if (this.#state.activeWorkspace.id === channel.workspace_id) {
            this.#state.channels = [...this.#state.channels, channel];
            this.#notify();
        }
    }

    updateChannel(channelId: string, updates: Partial<Channel>): void {
        if (!this.#state.activeWorkspace) return;

        // Update cache
        const workspaceId = this.#state.activeWorkspace.id;
        if (this.#workspaceCache[workspaceId]?.channels) {
            this.#workspaceCache[workspaceId].channels = this.#workspaceCache[workspaceId].channels!.map(
                (ch) => (ch.id === channelId ? { ...ch, ...updates } : ch)
            );
        }

        // Update current state if this is for the active workspace
        this.#state.channels = this.#state.channels.map(
            (ch) => (ch.id === channelId ? { ...ch, ...updates } : ch)
        );
        this.#notify();
    }

    setActiveChannel(channel: Channel | null): void {
        this.#state.activeChannel = channel;
        this.#notify();
    }

    updateWorkspace(updatedWorkspace: Workspace): void {
        if (!this.#state.activeWorkspace) return;

        // Update the active workspace
        this.#state.activeWorkspace = updatedWorkspace;

        // Update the workspace in the workspaces store
        workspaces.updateWorkspace(updatedWorkspace.id, updatedWorkspace);

        this.#notify();
    }
}

export const workspace = new WorkspaceStore(); 