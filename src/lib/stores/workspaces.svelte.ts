import { writable } from 'svelte/store';
import type { Workspace } from '$lib/types';

interface Channel {
    id: string;
    name: string;
    description?: string;
    workspace_id: string;
    is_private: boolean;
    created_at: string;
}

interface WorkspacesState {
    workspaces: Workspace[];
    activeWorkspaceId: string | null;
    activeChannelId: string | null;
    activeConversationId: string | null;
    channels: Channel[];
    isLoadingWorkspaces: boolean;
    isLoadingChannels: boolean;
}

function createWorkspacesStore() {
    const initialState: WorkspacesState = {
        workspaces: [],
        activeWorkspaceId: null,
        activeChannelId: null,
        activeConversationId: null,
        channels: [],
        isLoadingWorkspaces: false,
        isLoadingChannels: false
    };

    const { subscribe, set, update } = writable<WorkspacesState>(initialState);

    return {
        subscribe,
        loadWorkspaces: async () => {
            update(state => ({ ...state, isLoadingWorkspaces: true }));
            
            try {
                const response = await fetch('http://localhost:8000/api/workspaces', {
                    credentials: 'include'
                });
                
                if (!response.ok) {
                    throw new Error('Failed to fetch workspaces');
                }
                
                const workspaces = await response.json();
                update(state => ({
                    ...state,
                    workspaces,
                    isLoadingWorkspaces: false
                }));
                return workspaces;
            } catch (error) {
                console.error('Failed to fetch workspaces:', error);
                update(state => ({
                    ...state,
                    workspaces: [],
                    isLoadingWorkspaces: false
                }));
                return [];
            }
        },

        setActiveWorkspace: async (workspaceId: string | null) => {
            update(state => ({
                ...state,
                activeWorkspaceId: workspaceId,
                activeChannelId: null,
                activeConversationId: null,
                channels: [],
                isLoadingChannels: Boolean(workspaceId)
            }));
            
            if (workspaceId) {
                try {
                    const response = await fetch(`http://localhost:8000/api/workspaces/${workspaceId}/channels`, {
                        credentials: 'include'
                    });
                    
                    if (!response.ok) {
                        throw new Error('Failed to fetch channels');
                    }
                    
                    const channels = await response.json();
                    update(state => ({
                        ...state,
                        channels: channels.map((channel: any) => ({
                            id: channel.id,
                            name: channel.name,
                            description: channel.description,
                            workspace_id: channel.workspace_id,
                            is_private: channel.conversation_type === 'PRIVATE',
                            created_at: channel.created_at
                        })),
                        isLoadingChannels: false
                    }));
                } catch (error) {
                    console.error('Failed to fetch channels:', error);
                    update(state => ({
                        ...state,
                        channels: [],
                        isLoadingChannels: false
                    }));
                }
            }
        },

        setActiveChannel: (channelId: string | null) => {
            update(state => ({
                ...state,
                activeChannelId: channelId,
                activeConversationId: channelId
            }));
        },

        setActiveConversation: (conversationId: string | null) => {
            update(state => ({
                ...state,
                activeChannelId: null,
                activeConversationId: conversationId
            }));
        },

        addChannel: (channel: Channel) => {
            update(state => ({
                ...state,
                channels: [...state.channels, channel]
            }));
        },

        updateChannel: (channelId: string, updates: Partial<Channel>) => {
            update(state => ({
                ...state,
                channels: state.channels.map(channel =>
                    channel.id === channelId ? { ...channel, ...updates } : channel
                )
            }));
        },

        removeChannel: (channelId: string) => {
            update(state => ({
                ...state,
                channels: state.channels.filter(channel => channel.id !== channelId),
                activeChannelId: state.activeChannelId === channelId ? null : state.activeChannelId,
                activeConversationId: state.activeConversationId === channelId ? null : state.activeConversationId
            }));
        },

        reset: () => {
            set(initialState);
        }
    };
}

export const workspaces = createWorkspacesStore(); 