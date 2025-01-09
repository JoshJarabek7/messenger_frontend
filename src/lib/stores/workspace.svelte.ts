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
        setActiveWorkspace: async (workspaceId: string | null, preserveChannel: boolean = false) => {
            if (!workspaceId) {
                resetState();
                return;
            }

            let loadingToastId: string | number | undefined;
            try {
                // Show loading state and conditionally clear active channel
                update((state) => {
                    // If we're switching workspaces (not just reloading the same one), clear the active channel
                    const shouldClearChannel = !preserveChannel && state.activeWorkspaceId !== workspaceId;
                    return {
                        ...state,
                        isLoading: true,
                        activeChannelId: shouldClearChannel ? null : state.activeChannelId
                    };
                });
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

                // Dismiss loading toast after workspace data is loaded
                if (loadingToastId) {
                    toast.dismiss(loadingToastId);
                }

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
                    channels: channelsData,
                    activeWorkspace: workspaceData,
                    isLoading: false
                }));
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
            // Also update the workspace in the workspaces store
            workspaces.updateWorkspace(workspace.id, workspace);
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