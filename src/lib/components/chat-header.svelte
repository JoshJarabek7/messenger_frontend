<script lang="ts">
	import { Trash2 } from 'lucide-svelte';
	import * as Button from '$lib/components/ui/button';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { ConversationAPI } from '$lib/api/conversations';
	import { conversations } from '$lib/stores/conversations.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { toast } from 'svelte-sonner';
	import type { Conversation } from '$lib/types';
	import { workspace } from '$lib/stores/workspace.svelte';
	import { ChannelAPI } from '$lib/api/channels';

	let { conversation } = $props<{
		conversation: Conversation;
	}>();

	let isDeleteDialogOpen = $state(false);
	let canDelete = $state(false);

	// Check if user has permission to delete the channel
	$effect(() => {
		if (conversation.conversation_type === 'DIRECT') {
			// For DMs, both participants can delete
			canDelete = true;
		} else {
			// For channels, check if user is admin/owner of the workspace
			const currentUser = $auth.user;
			const workspaceMembers = workspace.state.members;
			const userRole = workspaceMembers.find((m) => m.id === currentUser?.id)?.role;
			canDelete = userRole === 'admin' || userRole === 'owner';
		}
	});

	async function handleDelete() {
		try {
			if (conversation.conversation_type === 'DIRECT') {
				await ConversationAPI.delete(conversation.id);
				toast.success('Conversation deleted');
			} else {
				await ChannelAPI.delete(conversation.id);
				toast.success('Channel deleted');
			}
			// The WebSocket handler will handle removing the conversation/channel from the store
		} catch (error) {
			console.error('Error deleting:', error);
			toast.error(
				`Failed to delete ${conversation.conversation_type === 'DIRECT' ? 'conversation' : 'channel'}`
			);
		} finally {
			isDeleteDialogOpen = false;
		}
	}

	// Get the other participant for DMs
	function getOtherParticipant() {
		if (conversation.conversation_type !== 'DIRECT') return null;
		const currentUserId = $auth.user?.id;
		if (conversation.participant_1?.id === currentUserId) {
			return conversation.participant_2;
		}
		return conversation.participant_1;
	}

	// Get the display name for the conversation
	$effect(() => {
		if (conversation.conversation_type === 'DIRECT') {
			const otherParticipant = getOtherParticipant();
			if (otherParticipant) {
				displayName = otherParticipant.display_name || otherParticipant.username;
			}
		} else {
			displayName = conversation.name;
		}
	});

	let displayName = $state('');
</script>

<div
	class="flex h-20 items-center justify-between border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60"
>
	<div class="flex items-center gap-4">
		<div class="flex flex-col">
			<h2 class="text-lg font-semibold">{displayName}</h2>
			{#if conversation.description}
				<p class="text-sm text-muted-foreground">{conversation.description}</p>
			{/if}
		</div>
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
							{conversation.conversation_type === 'DIRECT'
								? 'Delete Conversation'
								: 'Delete Channel'}
						</AlertDialog.Title>
						<AlertDialog.Description>
							{#if conversation.conversation_type === 'DIRECT'}
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
