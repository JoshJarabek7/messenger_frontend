import { writable } from 'svelte/store';

interface Channel {
    id: string;
    name: string;
    description?: string;
    workspace_id: string;
    is_private: boolean;
    created_at: string;
}

interface Workspace {
    id: string;
    name: string;
    description?: string;
    created_at: string;
}

interface WorkspaceState {
    activeWorkspaceId: string | null;
    activeChannelId: string | null;
    activeDmId: string | null;
    channels: Channel[];
    isLoadingChannels: boolean;
}

function createWorkspaceStore() {
    const { subscribe, set, update } = writable<WorkspaceState>({
        activeWorkspaceId: null,
        activeChannelId: null,
        activeDmId: null,
        channels: [],
        isLoadingChannels: false
    });

    let state: WorkspaceState = {
        activeWorkspaceId: null,
        activeChannelId: null,
        activeDmId: null,
        channels: [],
        isLoadingChannels: false
    };

    return {
        subscribe,
        get state() {
            return state;
        },
        setActiveWorkspace: async (workspaceId: string | null) => {
            update(s => {
                state = {
                    ...s,
                    activeWorkspaceId: workspaceId,
                    activeChannelId: null,
                    activeDmId: null,
                    channels: [],
                    isLoadingChannels: true
                };
                return state;
            });
            
            if (workspaceId) {
                try {
                    const response = await fetch(`http://localhost:8000/api/workspaces/${workspaceId}/channels`, {
                        credentials: 'include'
                    });
                    
                    if (!response.ok) {
                        throw new Error('Failed to fetch channels');
                    }
                    
                    const channels = await response.json();
                    update(s => {
                        state = {
                            ...s,
                            channels: channels.map((channel: any) => ({
                                id: channel.id,
                                name: channel.name,
                                description: channel.description,
                                workspace_id: channel.workspace_id,
                                is_private: channel.conversation_type === 'PRIVATE',
                                created_at: channel.created_at
                            })),
                            isLoadingChannels: false
                        };
                        return state;
                    });
                } catch (error) {
                    console.error('Failed to fetch channels:', error);
                    update(s => {
                        state = {
                            ...s,
                            channels: [],
                            isLoadingChannels: false
                        };
                        return state;
                    });
                }
            }
        },
        setActiveChannel: (channelId: string | null) => {
            update(s => {
                state = {
                    ...s,
                    activeChannelId: channelId,
                    activeDmId: null
                };
                return state;
            });
        },
        setActiveDm: (dmId: string | null) => {
            update(s => {
                state = {
                    ...s,
                    activeChannelId: null,
                    activeDmId: dmId
                };
                return state;
            });
        }
    };
}

export const workspace = createWorkspaceStore(); 