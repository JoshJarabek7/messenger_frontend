<script lang="ts">
	import { Trash2 } from 'lucide-svelte';
	import * as Button from '$lib/components/ui/button';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { conversation_api } from '$lib/api/conversation.svelte';
	import { conversation_store } from '$lib/stores/conversation.svelte';
	import { user_store } from '$lib/stores/user.svelte';
	import { workspace_store } from '$lib/stores/workspace.svelte';
	import { channel_api } from '$lib/api/channel.svelte';
	import { channel_store } from '$lib/stores/channel.svelte';
	import { ui_store } from '$lib/stores/ui.svelte';

	let { conversation_id } = $props<{
		conversation_id: string;
	}>();

	let isDeleteDialogOpen = $state(false);
	let canDelete = $state(false);
	let displayName = $state('');

	let conversation = $derived(() => conversation_store.getConversation(conversation_id));
	let channel = $derived(() => channel_api.getChannel(conversation_id));
	let me = $derived(user_store.getMe());

	// Check if user has permission to delete
	$effect(() => {
		if (!conversation() || !me) return;

		if (conversation()?.conversation_type === 'direct') {
			// For DMs, both participants can delete
			canDelete = true;
		} else if (conversation()?.channel_id) {
			// For channels, check if user is admin/owner of the workspace
			const channelId = conversation().channel_id as string;
			const channel = channel_store.getChannel(channelId);
			if (!channel) return;

			const workspace = workspace_store.getWorkspace(channel.workspace_id);
			if (!workspace) return;

			canDelete = workspace.created_by_id === me.id || workspace.admins.has(me.id);
		}
	});

	async function handleDelete() {
		try {
			if (conversation()?.conversation_type === 'direct') {
				await conversation_api.deleteConversation(conversation_id);
			} else {
				const channelId = conversation()?.channel_id;
				if (!channelId) {
					console.error('No channel ID found for conversation');
					return;
				}
				await channel_api.deleteChannel({ id: channelId });
				ui_store.unselectChannel();
			}
		} catch (error) {
			console.error('Error deleting:', error);
		} finally {
			isDeleteDialogOpen = false;
		}
	}

	// Get the display name for the conversation
	$effect(() => {
		if (!conversation) return;

		if (conversation()?.conversation_type === 'direct') {
			if (!conversation()?.user_id) return;
			const otherUser = user_store.getUser(conversation()?.user_id!);
			displayName = otherUser?.display_name || otherUser?.username || 'Unknown User';
		} else {
			const channel = channel_store.getChannel(conversation()!.channel_id!);
			displayName = channel?.name || 'Unknown Channel';
		}
	});
</script>

<div
	class="flex h-20 items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60"
>
	<div class="flex items-center gap-4">
		{#if conversation()?.conversation_type === 'direct'}
			<h2 class="text-lg font-semibold">{displayName}</h2>
		{:else}
			<div class="flex flex-col">
				<h2 class="text-lg font-semibold">{displayName}</h2>
				{#if conversation()?.channel_id}
					{@const channelId = conversation()?.channel_id as string}
					{#if channel_store.getChannel(channelId)?.description}
						<p class="text-sm text-muted-foreground">
							{channel_store.getChannel(channelId)?.description}
						</p>
					{/if}
				{/if}
			</div>
		{/if}
	</div>

	<div class="flex items-center gap-2">
		{#if canDelete}
			<AlertDialog.Root bind:open={isDeleteDialogOpen}>
				<AlertDialog.Trigger>
					<Button.Root variant="ghost" size="icon" class="h-8 w-8">
						<Trash2 class="h-4 w-4" />
					</Button.Root>
				</AlertDialog.Trigger>
				<AlertDialog.Content>
					<AlertDialog.Header>
						<AlertDialog.Title>
							{conversation()?.conversation_type === 'direct'
								? 'Delete Conversation'
								: 'Delete Channel'}
						</AlertDialog.Title>
						<AlertDialog.Description>
							{#if conversation()?.conversation_type === 'direct'}
								Are you sure you want to delete this conversation? This action cannot be undone. All
								messages and files will be permanently deleted.
							{:else}
								Are you sure you want to delete this channel? This action cannot be undone. All
								messages, files, and the channel itself will be permanently deleted.
							{/if}
						</AlertDialog.Description>
					</AlertDialog.Header>
					<AlertDialog.Footer>
						<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
						<AlertDialog.Action
							onclick={handleDelete}
							class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							Delete
						</AlertDialog.Action>
					</AlertDialog.Footer>
				</AlertDialog.Content>
			</AlertDialog.Root>
		{/if}
	</div>
</div>
