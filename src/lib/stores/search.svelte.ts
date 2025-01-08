import { writable } from 'svelte/store';
import type { Message, User, Workspace, FileAttachment } from '$lib/types';

type SearchType = 'MESSAGES' | 'FILES' | 'USERS' | 'WORKSPACES' | 'ALL';

interface SearchResults {
    messages: Message[];
    files: FileAttachment[];
    users: User[];
    workspaces: Workspace[];
}

interface SearchState {
    query: string;
    type: SearchType;
    workspaceId?: string;
    conversationId?: string;
    results: SearchResults;
    isLoading: boolean;
    error: string | null;
}

function createSearchStore() {
    const initialState: SearchState = {
        query: '',
        type: 'ALL',
        results: {
            messages: [],
            files: [],
            users: [],
            workspaces: []
        },
        isLoading: false,
        error: null
    };

    const { subscribe, set, update } = writable<SearchState>(initialState);

    return {
        subscribe,
        search: async (query: string, type: SearchType = 'ALL', workspaceId?: string, conversationId?: string) => {
            if (!query.trim()) {
                set(initialState);
                return;
            }

            update(state => ({
                ...state,
                query,
                type,
                workspaceId,
                conversationId,
                isLoading: true,
                error: null
            }));

            try {
                const params = new URLSearchParams({
                    query,
                    search_type: type
                });

                if (workspaceId) {
                    params.append('workspace_id', workspaceId);
                }
                if (conversationId) {
                    params.append('conversation_id', conversationId);
                }

                const response = await fetch(`http://localhost:8000/api/search?${params}`, {
                    credentials: 'include'
                });

                if (!response.ok) {
                    throw new Error('Search failed');
                }

                const results: SearchResults = await response.json();
                update(state => ({
                    ...state,
                    results,
                    isLoading: false
                }));
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
                update(state => ({
                    ...state,
                    error: errorMessage,
                    isLoading: false
                }));
                throw error;
            }
        },

        clear: () => {
            set(initialState);
        }
    };
}

export const search = createSearchStore(); 