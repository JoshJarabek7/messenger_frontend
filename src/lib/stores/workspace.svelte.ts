import { writable, type Subscriber, type Unsubscriber } from 'svelte/store';
import type { Channel, Workspace } from '$lib/types';
import { toast } from 'svelte-sonner';
import { workspaces } from './workspaces.svelte';
import { users } from './users.svelte';
import { conversations } from './conversations.svelte';

export interface WorkspaceState {
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
        const state = this.#state;
        for (const subscriber of this.#subscribers) {
            subscriber(state);
        }
    }

    get state() {
        return this.#state;
    }

    #setState(newState: Partial<WorkspaceState>) {
        this.#state = { ...this.#state, ...newState };
        this.#notify();
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

        // Create a new array to ensure reactivity and update cache
        const newChannels = [...channels];
        this.#workspaceCache[workspaceId].channels = newChannels;

        // Only update current state if this is the active workspace
        if (this.#state.activeWorkspace?.id === workspaceId) {
            this.#setState({
                channels: newChannels,
                isLoading: false // Ensure loading state is cleared
            });
        }

        // Log cache state for debugging
        console.log('Cache after setChannels:', {
            workspaceId,
            cachedChannels: this.#workspaceCache[workspaceId].channels?.length,
            stateChannels: this.#state.channels.length,
            isActiveWorkspace: this.#state.activeWorkspace?.id === workspaceId
        });
    }

    getWorkspaceData(workspaceId: string): {
        members?: any[];
        files?: any[];
        channels?: Channel[];
    } {
        const cache = this.#workspaceCache[workspaceId] || {};
        console.log('Getting workspace data:', {
            workspaceId,
            hasCache: !!this.#workspaceCache[workspaceId],
            channelCount: cache.channels?.length,
            isActiveWorkspace: this.#state.activeWorkspace?.id === workspaceId
        });
        return cache;
    }

    async selectWorkspace(workspaceId: string | null): Promise<void> {
        if (!workspaceId) {
            this.setActiveWorkspace(null);
            this.setActiveChannel(null);
            conversations.clearActiveConversation();
            return;
        }

        try {
            // Clear active channel and conversation when switching workspaces
            this.setActiveChannel(null);
            conversations.clearActiveConversation();

            // Get workspace details from workspaces store
            const workspaceDetails = workspaces.getWorkspace(workspaceId);
            if (!workspaceDetails) {
                throw new Error('Workspace not found');
            }

            // Get cached data
            const cachedData = this.#workspaceCache[workspaceId];

            // Set active workspace with cached data
            this.#setState({
                activeWorkspace: workspaceDetails,
                channels: cachedData?.channels || [],
                members: cachedData?.members || [],
                files: cachedData?.files || [],
                error: null
            });

        } catch (error) {
            console.error('Error selecting workspace:', error);
            this.#state.error = error instanceof Error ? error.message : 'Failed to select workspace';
            toast.error(this.#state.error);
            // Reset workspace state on error
            this.setActiveWorkspace(null);
        }
    }

    setActiveWorkspace(workspace: Workspace | null): void {
        const newState: Partial<WorkspaceState> = {
            activeWorkspace: workspace,
            activeChannel: null,
            error: null // Clear any previous errors
        };

        if (workspace) {
            const cachedData = this.#workspaceCache[workspace.id];
            if (cachedData) {
                if (cachedData.members) newState.members = [...cachedData.members];
                if (cachedData.files) newState.files = [...cachedData.files];
                if (cachedData.channels) newState.channels = [...cachedData.channels];
            } else {
                newState.members = [];
                newState.files = [];
                newState.channels = [];
            }
        } else {
            newState.members = [];
            newState.files = [];
            newState.channels = [];
        }

        this.#setState(newState);
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
            // Use setState to ensure reactivity
            this.#setState({
                channels: [...this.#state.channels, channel]
            });
        }
    }

    addMember(workspaceId: string, member: { id: string; role: 'owner' | 'admin' | 'member' }): void {
        if (!this.#workspaceCache[workspaceId]) {
            this.#workspaceCache[workspaceId] = {};
        }

        // Initialize members array if it doesn't exist
        if (!this.#workspaceCache[workspaceId].members) {
            this.#workspaceCache[workspaceId].members = [];
        }

        // Add the new member to the cache
        this.#workspaceCache[workspaceId].members = [
            ...this.#workspaceCache[workspaceId].members!,
            member
        ];

        // Update current state if this is the active workspace
        if (this.#state.activeWorkspace?.id === workspaceId) {
            this.#setState({
                members: [...this.#state.members, member]
            });
        }
    }

    removeMember(workspaceId: string, userId: string): void {
        // Update cache
        if (this.#workspaceCache[workspaceId]?.members) {
            this.#workspaceCache[workspaceId].members = this.#workspaceCache[workspaceId].members!.filter(
                member => member.id !== userId
            );
        }

        // Update current state if this is the active workspace
        if (this.#state.activeWorkspace?.id === workspaceId) {
            this.#setState({
                members: this.#state.members.filter(member => member.id !== userId)
            });
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
        // Use setState to ensure reactivity
        this.#setState({
            channels: this.#state.channels.map(
                (ch) => (ch.id === channelId ? { ...ch, ...updates } : ch)
            )
        });
    }

    setActiveChannel(channel: Channel | null): void {
        // Clear any previous error when setting active channel
        this.#setState({
            activeChannel: channel,
            error: null
        });
    }

    updateWorkspace(updatedWorkspace: Workspace): void {
        if (!this.#state.activeWorkspace) return;

        // Update the workspace in the workspaces store first
        workspaces.updateWorkspace(updatedWorkspace.id, updatedWorkspace);

        // Then update our state
        this.#setState({
            activeWorkspace: updatedWorkspace
        });
    }

    removeChannel(channelId: string): void {
        if (!this.#state.activeWorkspace) return;

        console.log('Removing channel:', channelId);

        // Check if this is the active channel
        const isActiveChannel = this.#state.activeChannel?.id === channelId;

        // If this was the active channel, clear it first
        if (isActiveChannel) {
            this.setActiveChannel(null);
        }

        // Update cache first
        const workspaceId = this.#state.activeWorkspace.id;
        if (this.#workspaceCache[workspaceId]?.channels) {
            this.#workspaceCache[workspaceId].channels = this.#workspaceCache[workspaceId].channels!.filter(
                ch => ch.id !== channelId
            );
        }

        // Create a new channels array to ensure reactivity
        const updatedChannels = this.#state.channels.filter(ch => ch.id !== channelId);

        // Update state in one atomic operation to ensure reactivity
        this.#setState({
            channels: updatedChannels,
            activeChannel: isActiveChannel ? null : this.#state.activeChannel
        });

        // Log the state for debugging
        console.log('State after channel removal:', {
            channelCount: updatedChannels.length,
            channels: updatedChannels.map(c => c.id),
            activeChannel: this.#state.activeChannel?.id,
            removedChannelId: channelId,
            isActiveChannel,
            cacheChannels: this.#workspaceCache[workspaceId]?.channels?.length
        });

        // If this was the active channel, select the workspace to show landing page
        if (isActiveChannel && this.#state.activeWorkspace) {
            this.selectWorkspace(this.#state.activeWorkspace.id);
        }
    }

    setLoading(isLoading: boolean): void {
        this.#setState({ isLoading });
    }
}

export const workspace = new WorkspaceStore(); 