import type { SvelteSet } from 'svelte/reactivity';

export type WorkspaceRole = 'admin' | 'member' | 'owner';

export interface IWorkspace {
	id: string;
	name: string;
	description?: string;
	slug: string;
	s3_key?: string;
	created_at: string;
	created_by_id: string;
	is_active: boolean;
	files: SvelteSet<string>;
	conversations: SvelteSet<string>;
	admins: SvelteSet<string>;
	members: SvelteSet<string>;
	channels: SvelteSet<string>;
}

export interface IWorkspaceGet {
	id: string;
}

export interface IWorkspaceCreate {
	name: string;
	description?: string;
}

export interface IWorkspaceUpdate {
	id: string;
	name: string;
	description?: string;
	image_s3_key?: string;
}

export interface IWorkspaceUpdateImage {
	id: string;
	image_s3_key: string;
}

export interface IWorkspaceDelete {
	id: string;
}
