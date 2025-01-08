import type { Message, User, Workspace, FileAttachment } from '$lib/types';

export type SearchType = 'MESSAGES' | 'FILES' | 'USERS' | 'WORKSPACES' | 'ALL';

export interface SearchResults {
    messages: Message[];
    files: FileAttachment[];
    users: User[];
    workspaces: Workspace[];
}

export class SearchAPI {
    static async search(
        query: string,
        type: SearchType = 'ALL',
        workspaceId?: string,
        conversationId?: string
    ): Promise<SearchResults> {
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

        return response.json();
    }

    static async searchMessages(
        query: string,
        workspaceId?: string,
        conversationId?: string
    ): Promise<Message[]> {
        const results = await this.search(query, 'MESSAGES', workspaceId, conversationId);
        return results.messages;
    }

    static async searchFiles(
        query: string,
        workspaceId?: string,
        conversationId?: string
    ): Promise<FileAttachment[]> {
        const results = await this.search(query, 'FILES', workspaceId, conversationId);
        return results.files;
    }

    static async searchUsers(
        query: string,
        workspaceId?: string
    ): Promise<User[]> {
        const results = await this.search(query, 'USERS', workspaceId);
        return results.users;
    }

    static async searchWorkspaces(
        query: string
    ): Promise<Workspace[]> {
        const results = await this.search(query, 'WORKSPACES');
        return results.workspaces;
    }
} 