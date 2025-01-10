<script lang="ts">
	import { workspace } from '$lib/stores/workspace.svelte';
	import { conversations } from '$lib/stores/conversations.svelte';
	import Chat from '$lib/components/chat.svelte';
	import WorkspaceLanding from '$lib/components/workspace-landing.svelte';

	// Determine what to show based on active workspace, channel, or DM
	$effect(() => {
		console.log('Active state:', {
			workspace: $workspace.activeWorkspace?.id,
			channel: $workspace.activeChannel?.id,
			conversation: $conversations.activeConversationId
		});
	});
</script>

<main class="relative flex-1 overflow-hidden">
	{#if $workspace.isLoading}
		<div class="flex h-full items-center justify-center">
			<div
				class="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
			></div>
		</div>
	{:else if $workspace.activeWorkspace && !$workspace.activeChannel && !$conversations.activeConversationId}
		<!-- Show workspace landing when no channel or DM is selected -->
		<WorkspaceLanding />
	{:else if $workspace.activeChannel}
		<!-- Show channel chat -->
		<Chat chatId={$workspace.activeChannel.id} chatType="PUBLIC" />
	{:else if $conversations.activeConversationId}
		<!-- Show DM chat -->
		<Chat chatId={$conversations.activeConversationId} chatType="DIRECT" />
	{:else}
		<!-- Show empty state -->
		<div class="flex h-full flex-col items-center justify-center">
			<h2 class="text-2xl font-semibold">Welcome to Slack Clone</h2>
			<p class="mt-2 text-muted-foreground">
				Select a workspace, channel, or direct message to start chatting
			</p>
		</div>
	{/if}
</main>
