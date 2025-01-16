<script lang="ts">
	import { conversation_store } from '$lib/stores/conversation.svelte';
	import Chat from '$lib/components/chat.svelte';
	import WorkspaceLanding from '$lib/components/workspace-landing.svelte';
	import { ui_store } from '$lib/stores/ui.svelte';
	import { buildWorkspace } from '$lib/helpers.svelte';
	import { channel_store } from '$lib/stores/channel.svelte';
	import { workspace_store } from '$lib/stores/workspace.svelte';

	let isLoading = $state(false);
	let conversation_id = $state<string | null>(null);

	$effect(() => {
		conversation_id =
			channel_store.getChannel(ui_store.channelSelected()!)?.conversation_id || null;
	});

	$effect(async () => {
		const workspace_id = ui_store.workspaceSelected();
		if (!workspace_id) return;

		if (!workspace_store.getWorkspace(workspace_id)) {
			try {
				isLoading = true;
				await buildWorkspace(workspace_id);
			} catch (error) {
				console.error('Failed to load workspace:', error);
			} finally {
				isLoading = false;
			}
		}
	});
</script>

<main class="relative flex-1 overflow-hidden">
	{#if ui_store.getIsLoading() || isLoading}
		<div class="flex h-full items-center justify-center">
			<div
				class="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
			></div>
		</div>
	{:else if ui_store.workspaceSelected() && !ui_store.channelSelected() && !ui_store.directMessageConversationSelected()}
		<WorkspaceLanding workspace_id={ui_store.workspaceSelected()!} />
	{:else if ui_store.channelSelected()}
		<!-- Show channel chat -->
		{#key ui_store.channelSelected()}
			{#if channel_store.getChannel(ui_store.channelSelected()!)}
				{#if conversation_store.getConversation(channel_store.getChannel(ui_store.channelSelected()!).conversation_id)}
					<Chat
						conversation_id={channel_store.getChannel(ui_store.channelSelected()!).conversation_id}
					/>
				{:else}
					<div class="flex h-full items-center justify-center">
						<div
							class="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
						></div>
					</div>
				{/if}
			{:else}
				<div class="flex h-full items-center justify-center">
					<div
						class="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
					></div>
				</div>
			{/if}
		{/key}
	{:else if ui_store.directMessageConversationSelected()}
		<!-- Show DM chat -->
		{#key ui_store.directMessageConversationSelected()}
			<Chat conversation_id={ui_store.directMessageConversationSelected()!} />
		{/key}
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
