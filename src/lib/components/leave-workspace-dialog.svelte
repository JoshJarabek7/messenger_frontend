<script lang="ts">
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { toast } from 'svelte-sonner';
	import { workspace_api } from '$lib/api/workspace.svelte';
	import { workspace_store } from '$lib/stores/workspace.svelte';
	import { user_store } from '$lib/stores/user.svelte';
	import { ui_store } from '$lib/stores/ui.svelte';
	import { unbuildWorkspace } from '$lib/helpers.svelte';
	let isLeaving = false;
	async function handleLeave() {
		isLeaving = true;
		await workspace_api.leaveWorkspace(ui_store.workspaceSelected()!);
		unbuildWorkspace(ui_store.workspaceSelected()!);
		ui_store.unselectWorkspace();
		isLeaving = false;
		toast.success('Successfully left workspace');
	}
</script>

<AlertDialog.Root bind:open={ui_store.leave_workspace_dialog_open}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Leave Workspace</AlertDialog.Title>
			<AlertDialog.Description>
				{#if workspace_store.getRole(ui_store.workspaceSelected()!, user_store.getMe()!.id) === 'owner'}
					<p class="mb-2 font-semibold text-destructive">
						Warning: You are the only owner of this workspace.
					</p>
					<p>
						If you leave, the entire workspace will be permanently deleted, including all channels,
						messages, files, and member access. This action cannot be undone.
					</p>
				{:else if workspace_store.getRole(ui_store.workspaceSelected()!, user_store.getMe()!.id) === 'admin'}
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
			<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action
				class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
				onclick={handleLeave}
			>
				{isLeaving
					? 'Leaving...'
					: workspace_store.getRole(ui_store.workspaceSelected()!, user_store.getMe()!.id) ===
						  'owner'
						? 'Leave and Delete Workspace'
						: 'Leave Workspace'}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
