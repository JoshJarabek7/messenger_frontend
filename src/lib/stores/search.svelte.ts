import { writable } from 'svelte/store';

interface SearchResult {
    users: Array<{
        id: string;
        username: string;
        display_name?: string;
        avatar_url?: string;
        email?: string;
    }>;
    workspaces: Array<{
        id: string;
        name: string;
        icon_url?: string;
        slug: string;
    }>;
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

                const response = await fetch(`http://localhost:8000/api/search/global?${params}`, {
                    credentials: 'include'
                });

                if (!response.ok) {
                    throw new Error('Failed to search');
                }

                const results = await response.json();
                update(s => ({
                    ...s,
                    results,
                    isLoading: false
                }));
            } catch (error) {
                console.error('Search error:', error);
                update(s => ({
                    ...s,
                    error: 'Failed to perform search',
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