import { writable } from 'svelte/store';
import type { Channel, Workspace } from '$lib/types';
import { toast } from 'svelte-sonner';
import { workspaces } from './workspaces.svelte';

interface WorkspaceState {
    activeWorkspaceId: string | null;
    activeChannelId: string | null;
    activeDmId: string | null;
    channels: Channel[];
    activeWorkspace: Workspace | null;
    isLoading: boolean;
}

function createWorkspaceStore() {
    const { subscribe, set, update } = writable<WorkspaceState>({
        activeWorkspaceId: null,
        activeChannelId: null,
        activeDmId: null,
        channels: [],
        activeWorkspace: null,
        isLoading: false
    });

    function resetState() {
        update((state) => ({
            ...state,
            activeWorkspaceId: null,
            activeChannelId: null,
            channels: [],
            activeWorkspace: null,
            isLoading: false
        }));
    }

    return {
        subscribe,
        setActiveWorkspace: async (workspaceId: string | null) => {
            if (!workspaceId) {
                resetState();
                return;
            }

            let loadingToastId: string | undefined;
            try {
                // Show loading state
                update((state) => ({ ...state, isLoading: true }));
                loadingToastId = toast.loading('Loading workspace...');

                // Fetch workspace details
                const workspaceResponse = await fetch(`http://localhost:8000/api/workspaces/${workspaceId}`, {
                    credentials: 'include'
                });

                // Handle different error cases
                if (!workspaceResponse.ok) {
                    if (workspaceResponse.status === 404) {
                        // Remove the workspace from the workspaces store if it's not found
                        workspaces.removeWorkspace(workspaceId);
                        throw new Error('Workspace not found. It may have been deleted.');
                    } else if (workspaceResponse.status === 403) {
                        throw new Error('You do not have access to this workspace.');
                    } else {
                        throw new Error('Failed to fetch workspace');
                    }
                }

                const workspaceData = await workspaceResponse.json();

                // Fetch channels for the workspace
                const channelsResponse = await fetch(
                    `http://localhost:8000/api/workspaces/${workspaceId}/channels`,
                    {
                        credentials: 'include'
                    }
                );
                if (!channelsResponse.ok) {
                    throw new Error('Failed to fetch channels');
                }
                const channelsData = await channelsResponse.json();

                update((state) => ({
                    ...state,
                    activeWorkspaceId: workspaceId,
                    activeChannelId: null,
                    channels: channelsData,
                    activeWorkspace: workspaceData,
                    isLoading: false
                }));

                // Dismiss loading toast on success
                if (loadingToastId) {
                    toast.dismiss(loadingToastId);
                }
            } catch (error) {
                console.error('Error setting active workspace:', error);

                // Handle different types of errors
                if (error instanceof Error) {
                    if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
                        toast.error('Network error. Please check your connection and try again.');
                    } else {
                        toast.error(error.message);
                    }
                } else {
                    toast.error('An unexpected error occurred. Please try again.');
                }

                // Reset workspace state on error
                resetState();
            } finally {
                // Ensure loading toast is dismissed
                if (loadingToastId) {
                    toast.dismiss(loadingToastId);
                }
                // Ensure loading state is reset
                update((state) => ({ ...state, isLoading: false }));
            }
        },
        setActiveChannel: (channelId: string | null) => {
            update((state) => ({
                ...state,
                activeChannelId: channelId
            }));
        },
        setActiveDm: (userId: string | null) => {
            update((state) => ({
                ...state,
                activeDmId: userId
            }));
        },
        clearActiveChannel: () => {
            update((state) => ({
                ...state,
                activeChannelId: null
            }));
        },
        updateWorkspace: (workspace: Workspace) => {
            update((state) => ({
                ...state,
                activeWorkspace: workspace
            }));
        },
        updateChannel: (channelId: string, updates: Partial<Channel>) => {
            update((state) => ({
                ...state,
                channels: state.channels.map((channel) =>
                    channel.id === channelId ? { ...channel, ...updates } : channel
                )
            }));
        }
    };
}

export const workspace = createWorkspaceStore(); 