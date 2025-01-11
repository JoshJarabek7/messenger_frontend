import type { Workspace, User } from '$lib/types';
import { API_BASE_URL } from '$lib/config.ts';

export class WorkspaceAPI {
    static async getAll(): Promise<Workspace[]> {
        const response = await fetch('${API_BASE_URL}/workspaces', {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to fetch workspaces');
        }

        return response.json();
    }

    static async create(name: string, description?: string): Promise<Workspace> {
        const response = await fetch('${API_BASE_URL}/workspaces', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ name, description })
        });

        if (!response.ok) {
            throw new Error('Failed to create workspace');
        }

        return response.json();
    }

    static async get(workspaceId: string): Promise<Workspace> {
        const response = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}`, {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to fetch workspace');
        }

        return response.json();
    }

    static async update(workspaceId: string, updates: {
        name?: string;
        description?: string;
        icon_url?: string;
    }): Promise<Workspace> {
        const response = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(updates)
        });

        if (!response.ok) {
            throw new Error('Failed to update workspace');
        }

        return response.json();
    }

    static async delete(workspaceId: string): Promise<void> {
        const response = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to delete workspace');
        }
    }

    static async getMembers(workspaceId: string): Promise<User[]> {
        const response = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/members`, {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to fetch members');
        }

        return response.json();
    }

    static async addMember(workspaceId: string, email: string, role: 'member' | 'admin' = 'member'): Promise<void> {
        const response = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/members`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ email, role })
        });

        if (!response.ok) {
            throw new Error('Failed to add member');
        }
    }

    static async removeMember(workspaceId: string, userId: string): Promise<void> {
        const response = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/members/${userId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to remove member');
        }
    }

    static async updateMemberRole(workspaceId: string, userId: string, role: 'member' | 'admin'): Promise<void> {
        const response = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/members/${userId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ role })
        });

        if (!response.ok) {
            throw new Error('Failed to update member role');
        }
    }

    static async leave(workspaceId: string): Promise<void> {
        const response = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/leave`, {
            method: 'POST',
            credentials: 'include'
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to leave workspace');
        }
    }

    static async join(workspaceId: string): Promise<Workspace> {
        const response = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/join`, {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to join workspace');
        }

        return response.json();
    }

    static async createInvite(workspaceId: string, expiresIn?: number): Promise<string> {
        const response = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/invite`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ expires_in: expiresIn })
        });

        if (!response.ok) {
            throw new Error('Failed to create invite');
        }

        const data = await response.json();
        return data.invite_code;
    }
} 