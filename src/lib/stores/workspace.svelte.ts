import type { IWorkspace } from '$lib/types/workspaces.svelte';
import { API_BASE_URL } from '$lib/config';
import { workspace_api } from '$lib/api/workspace.svelte';

class WorkspaceStore {
	static #instance: WorkspaceStore;
	private workspaces = $state<Record<string, IWorkspace>>({});

	private constructor() { }

	public static getInstance(): WorkspaceStore {
		if (!WorkspaceStore.#instance) {
			WorkspaceStore.#instance = new WorkspaceStore();
		}
		return WorkspaceStore.#instance;
	}

	public getWorkspace(workspace_id: string): IWorkspace {
		return this.workspaces[workspace_id];
	}

	public getWorkspaces(): IWorkspace[] {
		return Object.values(this.workspaces);
	}

	public updateWorkspace(workspace_id: string, updates: Partial<IWorkspace>): void {
		if (!this.workspaces[workspace_id]) return;
		Object.assign(this.workspaces[workspace_id], updates);
	}

	public addWorkspace(workspace: IWorkspace): void {
		this.workspaces[workspace.id] = workspace;
	}

	public removeWorkspace(workspace_id: string): void {
		delete this.workspaces[workspace_id];
	}

	public addMember(workspace_id: string, user_id: string): void {
		if (!this.workspaces[workspace_id]) return;
		const newMembers = new Set(this.workspaces[workspace_id].members);
		newMembers.add(user_id);
		this.workspaces[workspace_id] = {
			...this.workspaces[workspace_id],
			members: newMembers
		};
	}

	public removeMember(workspace_id: string, user_id: string): void {
		if (!this.workspaces[workspace_id]) return;
		const newMembers = new Set(this.workspaces[workspace_id].members);
		newMembers.delete(user_id);
		this.workspaces[workspace_id] = {
			...this.workspaces[workspace_id],
			members: newMembers
		};
	}

	public setOwner(workspace_id: string, user_id: string): void {
		if (!this.workspaces[workspace_id]) return;
		this.workspaces[workspace_id] = {
			...this.workspaces[workspace_id],
			created_by_id: user_id
		};
	}

	public addAdmin(workspace_id: string, user_id: string): void {
		if (!this.workspaces[workspace_id]) return;
		const newAdmins = new Set(this.workspaces[workspace_id].admins);
		newAdmins.add(user_id);
		this.workspaces[workspace_id] = {
			...this.workspaces[workspace_id],
			admins: newAdmins
		};
	}

	public removeAdmin(workspace_id: string, user_id: string): void {
		if (!this.workspaces[workspace_id]) return;
		const newAdmins = new Set(this.workspaces[workspace_id].admins);
		newAdmins.delete(user_id);
		this.workspaces[workspace_id] = {
			...this.workspaces[workspace_id],
			admins: newAdmins
		};
	}

	public addChannel(workspace_id: string, channel_id: string): void {
		if (!this.workspaces[workspace_id]) return;
		this.workspaces[workspace_id].channels = new Set([
			...Array.from(this.workspaces[workspace_id].channels),
			channel_id
		]);
	}

	public removeChannel(workspace_id: string, channel_id: string): void {
		if (!this.workspaces[workspace_id]) return;
		this.workspaces[workspace_id].channels = new Set(
			Array.from(this.workspaces[workspace_id].channels).filter(id => id !== channel_id)
		);
	}

	public addFile(workspace_id: string, file_id: string): void {
		if (!this.workspaces[workspace_id]) return;
		this.workspaces[workspace_id].files.add(file_id);
	}

	public removeFile(workspace_id: string, file_id: string): void {
		if (!this.workspaces[workspace_id]) return;
		this.workspaces[workspace_id].files.delete(file_id);
	}

	public getRole(workspace_id: string, user_id: string): 'admin' | 'member' | 'owner' | null {
		if (!this.workspaces[workspace_id]) {
			return null;
		}
		if (this.workspaces[workspace_id].created_by_id === user_id) {
			return 'owner';
		}
		if (this.workspaces[workspace_id].admins.has(user_id)) {
			return 'admin';
		}
		if (this.workspaces[workspace_id].members.has(user_id)) {
			return 'member';
		}
		return null;
	}
}

export const workspace_store = WorkspaceStore.getInstance();