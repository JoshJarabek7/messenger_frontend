import type {
	IWorkspace,
	IWorkspaceGet,
	IWorkspaceCreate,
	IWorkspaceUpdate,
	IWorkspaceUpdateImage
} from '$lib/types/workspaces.svelte';
import { API_BASE_URL } from '$lib/config';
import { file_api } from '$lib/api/file.svelte';

class WorkspaceAPI {
	public async getWorkspace(workspace: IWorkspaceGet): Promise<IWorkspace> {
		const response = await fetch(`${API_BASE_URL}/workspaces/${workspace.id}`, {
			credentials: 'include',
			method: 'GET'
		});
		if (!response.ok) {
			if (response.status === 403) {
				throw new Error('You are not authorized to view this workspace.');
			}
			throw new Error('Failed to fetch workspace.');
		}
		const data: IWorkspace = await response.json();
		return data;
	}

	public async getWorkspaces(): Promise<IWorkspace[]> {
		const response = await fetch(`${API_BASE_URL}/workspaces`, {
			credentials: 'include',
			method: 'GET'
		});
		if (!response.ok) {
			throw new Error('Failed to get workspaces.');
		}
		const data: IWorkspace[] = await response.json();
		return data;
	}

	public async createWorkspace(workspace: IWorkspaceCreate): Promise<IWorkspace> {
		const response = await fetch(`${API_BASE_URL}/workspaces`, {
			credentials: 'include',
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(workspace)
		});
		if (!response.ok) {
			throw new Error('Failed to create workspace.');
		}
		const data: IWorkspace = await response.json();
		return data;
	}

	public async updateWorkspace(workspace: IWorkspaceUpdate): Promise<IWorkspace> {
		const response = await fetch(`${API_BASE_URL}/workspaces/${workspace.id}`, {
			credentials: 'include',
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(workspace)
		});
		if (!response.ok) {
			if (response.status === 403) {
				throw new Error('You are not authorized to update this workspace.');
			}
			throw new Error('Failed to update workspace.');
		}
		const data: IWorkspace = await response.json();
		return data;
	}

	public async updateWorkspaceImage(workspace_id: string, file: File): Promise<IWorkspace> {
		const uploaded_file = await file_api.uploadFile(file);
		const workspace_update: IWorkspaceUpdateImage = {
			id: workspace_id,
			image_s3_key: uploaded_file.id
		};

		const response = await fetch(`${API_BASE_URL}/workspaces/${workspace_id}/image`, {
			credentials: 'include',
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(workspace_update)
		});
		if (!response.ok) {
			if (response.status === 403) {
				throw new Error('You are not authorized to update this workspace.');
			}
			throw new Error('Failed to update workspace image.');
		}
		const data: IWorkspace = await response.json();
		return data;
	}
	public async joinWorkspace(workspace_id: string): Promise<IWorkspace> {
		const response = await fetch(`${API_BASE_URL}/workspaces/${workspace_id}/join`, {
			credentials: 'include',
			method: 'POST'
		});
		if (!response.ok) {
			if (response.status === 403) {
				throw new Error('You are not authorized to join this workspace.');
			}
			if (response.status === 409) {
				throw new Error('You are already a member of this workspace.');
			}
			throw new Error('Failed to join workspace.');
		}
		// After joining, fetch the workspace details
		return await this.getWorkspace({ id: workspace_id });
	}

	public async leaveWorkspace(workspace_id: string): Promise<void> {
		const response = await fetch(`${API_BASE_URL}/workspaces/${workspace_id}/leave`, {
			credentials: 'include',
			method: 'POST'
		});
		if (!response.ok) {
			if (response.status === 403) {
				throw new Error('You are not authorized to leave this workspace.');
			}
			if (response.status === 409) {
				throw new Error('You are not a member of this workspace.');
			}
			throw new Error('Failed to leave workspace.');
		}
		// After leaving, remove workspace from store
	}

	public async doesWorkspaceExist(workspace_name: string): Promise<boolean> {
		const response = await fetch(`${API_BASE_URL}/workspaces/exists/${workspace_name}`, {
			credentials: 'include',
			method: 'GET'
		});
		if (!response.ok) {
			throw new Error('Failed to check workspace existence.');
		}
		const data: { exists: boolean } = await response.json();
		return data.exists;
	}

	public async removeMember(workspace_id: string, user_id: string): Promise<void> {
		const response = await fetch(`${API_BASE_URL}/workspaces/${workspace_id}/members/${user_id}`, {
			credentials: 'include',
			method: 'DELETE'
		});
		if (!response.ok) {
			throw new Error('Failed to remove member.');
		}
	}

	public async removeAdmin(workspace_id: string, user_id: string): Promise<void> {
		const response = await fetch(`${API_BASE_URL}/workspaces/${workspace_id}/admins/${user_id}`, {
			credentials: 'include',
			method: 'DELETE'
		});
		if (!response.ok) {
			throw new Error('Failed to remove admin.');
		}
	}

	public async updateMemberRole(
		workspace_id: string,
		user_id: string,
		role: 'admin' | 'member'
	): Promise<void> {
		const response = await fetch(`${API_BASE_URL}/workspaces/${workspace_id}/members/${user_id}`, {
			credentials: 'include',
			method: 'PATCH',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ role })
		});

		if (!response.ok) {
			const error = await response.json();
			throw new Error(error.detail || 'Failed to update member role.');
		}
	}

	async deleteWorkspace(workspace_id: string): Promise<void> {
		const response = await fetch(`${API_BASE_URL}/workspaces/${workspace_id}`, {
			credentials: 'include',
			method: 'DELETE'
		});

		if (!response.ok) {
			throw new Error('Failed to delete workspace');
		}
	}
}

export const workspace_api = new WorkspaceAPI();
