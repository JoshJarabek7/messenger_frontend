import { API_BASE_URL } from '$lib/config';
import type { IUser } from '$lib/types/user.svelte';
import type { IWorkspace } from '$lib/types/workspaces.svelte';

export type SearchType = 'WORKSPACES' | 'USERS';

class SearchAPI {
	public async search(query: string, type: SearchType): Promise<IWorkspace[] | IUser[]> {
		const response = await fetch(`${API_BASE_URL}/search/${type.toLowerCase()}?query=${query}`, {
			credentials: 'include',
			method: 'GET'
		});
		if (!response.ok) {
			throw new Error('Search failed');
		}
		return response.json();
	}
}

export const search_api = new SearchAPI();
