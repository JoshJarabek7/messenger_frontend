import { writable } from 'svelte/store';
import type { Message, User, Workspace, FileAttachment } from '$lib/types';
import { API_BASE_URL } from '$lib/config.ts';
type SearchType = 'messages' | 'files' | 'users' | 'workspaces' | 'all';

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
        type: 'all',
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
        search: async (query: string, type: SearchType = 'all', workspaceId?: string, conversationId?: string) => {
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

                const response = await fetch(`${API_BASE_URL}/search/global?${params}`, {
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