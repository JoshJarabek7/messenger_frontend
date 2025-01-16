import type { IWorkspace } from '$lib/types/workspaces.svelte';
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

	private cleanFileId(fileId: string): string {
		if (!fileId) return fileId;

		try {
			// If it's a URL, try to extract just the UUID
			if (fileId.startsWith('http')) {
				// First split by '/' to get path components
				const parts = fileId.split('/');
				// Get the last part (which should be the file ID)
				let id = parts[parts.length - 1];
				// Remove any query parameters
				id = id.split('?')[0];
				// Decode until we can't decode anymore
				while (true) {
					const decoded = decodeURIComponent(id);
					if (decoded === id) {
						break;
					}
					id = decoded;
				}
				return id;
			}

			// If it's not a URL, just decode it
			let decoded = fileId;
			while (true) {
				const newDecoded = decodeURIComponent(decoded);
				if (newDecoded === decoded) {
					break;
				}
				decoded = newDecoded;
			}
			return decoded;
		} catch (error) {
			console.error('Error cleaning file ID:', {
				original: fileId,
				error
			});
			return fileId;
		}
	}

	public addWorkspace(workspace: IWorkspace): void {

		// Initialize empty Sets if they don't exist
		workspace.channels = workspace.channels || new SvelteSet<string>();
		workspace.conversations = workspace.conversations || new SvelteSet<string>();

		// Convert members and admins to arrays if they're not already
		const memberArray = workspace.members ?
			(typeof workspace.members === 'object' && !Array.isArray(workspace.members) ?
				Array.from(workspace.members) : workspace.members) :
			[];

		const adminArray = workspace.admins ?
			(typeof workspace.admins === 'object' && !Array.isArray(workspace.admins) ?
				Array.from(workspace.admins) : workspace.admins) :
			[];

		workspace.members = new SvelteSet(memberArray);
		workspace.admins = new SvelteSet(adminArray);
		workspace.files = new SvelteSet(Array.isArray(workspace.files) ? workspace.files : []);
		// Clean up file IDs before storing them
		if (workspace.files) {
			const cleanFiles = new SvelteSet<string>();
			Array.from(workspace.files).forEach(fileId => {
				if (typeof fileId === 'string') {
					cleanFiles.add(this.cleanFileId(fileId));
				}
			});
			workspace.files = cleanFiles;
		}

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
		const workspace = this.getWorkspace(workspace_id);
		if (!workspace) return;

		const cleanFileId = this.cleanFileId(file_id);
		workspace.files.add(cleanFileId);
		this.workspaces.set(workspace_id, workspace);
	}

	public removeFile(workspace_id: string, file_id: string): void {
		const workspace = this.getWorkspace(workspace_id);
		if (!workspace) return;

		const cleanFileId = this.cleanFileId(file_id);
		workspace.files.delete(cleanFileId);
		this.workspaces.set(workspace_id, workspace);
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

	public handleUserJoinedWorkspace(data: { workspace_id: string; user_id: string }): void {
		const workspace = this.getWorkspace(data.workspace_id);
		if (workspace) {
			workspace.members.add(data.user_id);
			this.updateWorkspace(data.workspace_id, workspace);
		}
	}
}

export const workspace_store = WorkspaceStore.getInstance();