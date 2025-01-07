import { writable } from 'svelte/store';

interface User {
    id: string;
    username: string;
    display_name?: string;
    avatar_url?: string;
    email?: string;
}

interface Workspace {
    id: string;
    name: string;
    icon_url?: string;
    slug: string;
    is_member: boolean;
}

interface SearchResult {
    users: User[];
    workspaces: Workspace[];
}

interface SearchState {
    isLoading: boolean;
    results: SearchResult | null;
    error: string | null;
}

function createSearchStore() {
    const { subscribe, set, update } = writable<SearchState>({
        isLoading: false,
        results: null,
        error: null
    });

    return {
        subscribe,
        search: async (query: string, workspaceId?: string) => {
            update(s => ({ ...s, isLoading: true, error: null }));
            
            try {
                const params = new URLSearchParams({ query });
                if (workspaceId) {
                    params.append('workspace_id', workspaceId);
                }

                console.log('Searching with params:', params.toString());
                const response = await fetch(`http://localhost:8000/api/search/global?${params}`, {
                    credentials: 'include'
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.detail || 'Failed to search');
                }

                const results = await response.json();
                console.log('Search results:', results);
                update(s => ({
                    ...s,
                    results: {
                        users: results.users || [],
                        workspaces: results.workspaces || []
                    },
                    isLoading: false
                }));
            } catch (error) {
                console.error('Search error:', error);
                update(s => ({
                    ...s,
                    error: error instanceof Error ? error.message : 'Failed to perform search',
                    isLoading: false
                }));
            }
        },
        clearResults: () => {
            update(s => ({
                ...s,
                results: null,
                error: null
            }));
        }
    };
}

export const search = createSearchStore(); 