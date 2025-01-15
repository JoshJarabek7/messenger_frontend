import type { IWorkspace } from '$lib/types/workspaces.svelte';
import { API_BASE_URL } from '$lib/config';
import { workspace_api } from '$lib/api/workspace.svelte';
import { SvelteMap } from 'svelte/reactivity';
import { SvelteSet } from 'svelte/reactivity';
class WorkspaceStore {
	static #instance: WorkspaceStore;
	private workspaces = $state<SvelteMap<string, IWorkspace>>(new SvelteMap());

	private constructor() { }

	public static getInstance(): WorkspaceStore {
		if (!WorkspaceStore.#instance) {
			WorkspaceStore.#instance = new WorkspaceStore();
		}
		return WorkspaceStore.#instance;
	}

	public getWorkspace(workspace_id: string): IWorkspace | undefined {
		return this.workspaces.get(workspace_id) ?? undefined;
	}

	public getWorkspaces(): IWorkspace[] {
		return Array.from(this.workspaces.values());
	}

	public updateWorkspace(workspace_id: string, updates: Partial<IWorkspace>): void {
		if (!this.workspaces.get(workspace_id)) return;
		const workspace = this.workspaces.get(workspace_id)!;
		this.workspaces.set(workspace_id, { ...workspace, ...updates });
	}

	public addWorkspace(workspace: IWorkspace): void {
		// Initialize empty Sets if they don't exist
		workspace.channels = workspace.channels || new SvelteSet<string>();
		workspace.conversations = workspace.conversations || new SvelteSet<string>();
		workspace.members = new SvelteSet(Array.isArray(workspace.members) ? workspace.members : []);
		workspace.admins = new SvelteSet(Array.isArray(workspace.admins) ? workspace.admins : []);
		workspace.files = new SvelteSet(Array.isArray(workspace.files) ? workspace.files : []);

		this.workspaces.set(workspace.id, workspace);
	}

	public removeWorkspace(workspace_id: string): void {
		this.workspaces.delete(workspace_id);
	}

	public addMember(workspace_id: string, user_id: string): void {
		if (!this.workspaces.get(workspace_id)) return;
		this.workspaces.get(workspace_id)!.members.add(user_id);
	}

	public removeMember(workspace_id: string, user_id: string): void {
		if (!this.workspaces.get(workspace_id)) return;
		this.workspaces.get(workspace_id)!.members.delete(user_id);
	}

	public setOwner(workspace_id: string, user_id: string): void {
		if (!this.workspaces.get(workspace_id)) return;
		this.workspaces.get(workspace_id)!.created_by_id = user_id;
	}

	public addAdmin(workspace_id: string, user_id: string): void {
		if (!this.workspaces.get(workspace_id)) return;
		this.workspaces.get(workspace_id)!.admins.add(user_id);
	}

	public removeAdmin(workspace_id: string, user_id: string): void {
		if (!this.workspaces.get(workspace_id)) return;
		this.workspaces.get(workspace_id)!.admins.delete(user_id);
	}

	public addChannel(workspace_id: string, channel_id: string): void {
		if (!this.workspaces.get(workspace_id)) return;
		this.workspaces.get(workspace_id)!.channels.add(channel_id);
	}

	public removeChannel(workspace_id: string, channel_id: string): void {
		if (!this.workspaces.get(workspace_id)) return;
		this.workspaces.get(workspace_id)!.channels.delete(channel_id);
	}

	public addFile(workspace_id: string, file_id: string): void {
		if (!this.workspaces.get(workspace_id)) return;
		this.workspaces.get(workspace_id)!.files.add(file_id);
	}

	public removeFile(workspace_id: string, file_id: string): void {
		if (!this.workspaces.get(workspace_id)) return;
		this.workspaces.get(workspace_id)!.files.delete(file_id);
	}

	public getRole(workspace_id: string, user_id: string): 'admin' | 'member' | 'owner' | null {
		if (!this.workspaces.get(workspace_id)) {
			return null;
		}
		if (this.workspaces.get(workspace_id)!.created_by_id === user_id) {
			return 'owner';
		}
		if (this.workspaces.get(workspace_id)!.admins.has(user_id)) {
			return 'admin';
		}
		if (this.workspaces.get(workspace_id)!.members.has(user_id)) {
			return 'member';
		}
		return null;
	}
}

export const workspace_store = WorkspaceStore.getInstance();