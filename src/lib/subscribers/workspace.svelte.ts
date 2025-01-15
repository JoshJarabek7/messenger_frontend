import { workspace_store } from '$lib/stores/workspace.svelte';
import { ui_store } from '$lib/stores/ui.svelte';
import type { IWorkspace } from '$lib/types/workspaces.svelte';
import { buildFile, buildUser, unbuildWorkspace, unbuildFile, unbuildUser } from '$lib/helpers.svelte';
import { conversation_store } from '$lib/stores/conversation.svelte';

export async function userJoinedWorkspace(
	user_id: string,
	role: 'admin' | 'member' | 'owner',
	workspace_id: string
): Promise<void> {
	const workspace = workspace_store.getWorkspace(workspace_id);
	if (!workspace) return;

	await buildUser(user_id);

	if (role === 'admin') {
		workspace_store.addAdmin(workspace_id, user_id);
	} else if (role === 'member') {
		workspace_store.addMember(workspace_id, user_id);
	} else if (role === 'owner') {
		workspace_store.setOwner(workspace_id, user_id);
	}
}

export function userLeftWorkspace(user_id: string, workspace_id: string) {
	const workspace = workspace_store.getWorkspace(workspace_id);
	if (!workspace) return;

	// Get the user's role before removing them
	const role = workspace_store.getRole(workspace_id, user_id);

	// Remove from appropriate role collection
	if (role === 'admin') {
		workspace_store.removeAdmin(workspace_id, user_id);
	} else if (role === 'member') {
		workspace_store.removeMember(workspace_id, user_id);
	}

	// Check if user is still in any workspaces
	let userInOtherWorkspaces = false;
	for (const ws of workspace_store.getWorkspaces()) {
		if (ws.id !== workspace_id &&
			(ws.members.has(user_id) ||
				ws.admins.has(user_id) ||
				ws.created_by_id === user_id)) {
			userInOtherWorkspaces = true;
			break;
		}
	}

	// If user is not in any other workspaces and not in any DMs, unbuild them
	if (!userInOtherWorkspaces) {
		const dms = conversation_store.getAllDirectMessages();
		const userInDMs = dms.some(dm => dm.user_id === user_id);
		if (!userInDMs) {
			unbuildUser(user_id);
		}
	}
}

export function workspaceDeleted(workspace_id: string) {
	if (ui_store.workspaceSelected() === workspace_id) {
		ui_store.unselectChannel();
		ui_store.unselectWorkspace();
	}
	unbuildWorkspace(workspace_id);
}

export function workspaceUpdated(workspace_id: string, workspace: Partial<IWorkspace>) {
	workspace_store.updateWorkspace(workspace_id, workspace);
}

export async function workspaceFileAdded(workspace_id: string, file_id: string) {
	const workspace = workspace_store.getWorkspace(workspace_id);
	if (!workspace) return;
	buildFile(file_id);
	workspace_store.addFile(workspace_id, file_id);
}

export function workspaceFileDeleted(workspace_id: string, file_id: string) {
	const workspace = workspace_store.getWorkspace(workspace_id);
	if (!workspace) return;
	workspace_store.removeFile(workspace_id, file_id);
	unbuildFile(file_id);
}

export function workspaceRoleUpdated(
	workspace_id: string,
	user_id: string,
	role: 'admin' | 'member' | 'owner'
) {
	const past_role = workspace_store.getRole(workspace_id, user_id);
	if (past_role === role) return;
	if (past_role === 'admin') {
		workspace_store.removeAdmin(workspace_id, user_id);
		if (role === 'member') {
			workspace_store.addMember(workspace_id, user_id);
		} else if (role === 'owner') {
			workspace_store.setOwner(workspace_id, user_id);
		}
	} else if (past_role === 'member') {
		workspace_store.removeMember(workspace_id, user_id);
		if (role === 'admin') {
			workspace_store.addAdmin(workspace_id, user_id);
		} else if (role === 'owner') {
			workspace_store.setOwner(workspace_id, user_id);
		}
	}
}
