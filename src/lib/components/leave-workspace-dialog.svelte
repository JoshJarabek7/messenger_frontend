<script lang="ts">
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { workspace } from '$lib/stores/workspace.svelte';
	import { workspaces } from '$lib/stores/workspaces.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { WorkspaceAPI } from '$lib/api/workspace';

	export let open = false;
	let isLeaving = false;

	$: userRole = $workspace.members.find((m) => m.id === $auth.user?.id)?.role || 'member';
	$: isOnlyOwner =
		userRole === 'owner' && $workspace.members.filter((m) => m.role === 'owner').length === 1;

	async function handleLeave() {
		if (!$workspace.activeWorkspace) return;

		try {
			isLeaving = true;
			await WorkspaceAPI.leave($workspace.activeWorkspace.id);
			workspaces.removeWorkspace($workspace.activeWorkspace.id);
			workspace.setActiveWorkspace(null);
			toast.success('Successfully left workspace');
		} catch (error) {
			console.error('Error leaving workspace:', error);
			toast.error('Failed to leave workspace');
		} finally {
			isLeaving = false;
			open = false;
		}
	}
</script>

<AlertDialog.Root bind:open>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Leave Workspace</AlertDialog.Title>
			<AlertDialog.Description>
				{#if isOnlyOwner}
					<p class="mb-2 font-semibold text-destructive">
						Warning: You are the only owner of this workspace.
					</p>
					<p>
						If you leave, the entire workspace will be permanently deleted, including all channels,
						messages, files, and member access. This action cannot be undone.
					</p>
				{:else if userRole === 'owner'}
					<p>
						Are you sure you want to leave this workspace? You will lose owner access, but the
						workspace will continue to operate under other owners.
					</p>
				{:else if userRole === 'admin'}
					<p>
						Are you sure you want to leave this workspace? You will lose admin access and all
						administrative privileges.
					</p>
				{:else}
					<p>
						Are you sure you want to leave this workspace? You will lose access to all channels,
						messages, and files.
					</p>
				{/if}
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel disabled={isLeaving}>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action
				class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
				disabled={isLeaving}
				onclick={handleLeave}
			>
				{isLeaving ? 'Leaving...' : isOnlyOwner ? 'Leave and Delete Workspace' : 'Leave Workspace'}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
