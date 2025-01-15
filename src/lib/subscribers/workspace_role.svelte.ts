import { workspace_store } from '$lib/stores/workspace.svelte';
import type { WorkspaceRole } from '$lib/types/workspaces.svelte';
import { buildUser } from '$lib/helpers.svelte';

export async function workspaceRoleUpdated(
	workspace_id: string,
	user_id: string,
	role: WorkspaceRole
) {
	const workspace = workspace_store.getWorkspace(workspace_id);
	if (!workspace) return;

	// First ensure the user is built
	await buildUser(user_id);

	// Remove from all roles
	workspace_store.removeMember(workspace_id, user_id);
	workspace_store.removeAdmin(workspace_id, user_id);

	// Add to new role
	if (role === 'admin') {
		workspace_store.addAdmin(workspace_id, user_id);
	} else if (role === 'member') {
		workspace_store.addMember(workspace_id, user_id);
	} else if (role === 'owner') {
		workspace_store.setOwner(workspace_id, user_id);
	}
}
