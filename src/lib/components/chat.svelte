<script lang="ts">
	import ChatMessage from './chat-message.svelte';
	import ChatInput from './chat-input.svelte';
	import ChatHeader from './chat-header.svelte';
	import { Loader2, ArrowDown } from 'lucide-svelte';
	import * as Button from '$lib/components/ui/button';
	import { conversation_store } from '$lib/stores/conversation.svelte';
	import { file_api } from '$lib/api/file.svelte';
	import { user_store } from '$lib/stores/user.svelte';
	import { getConversationMessages, buildConversation } from '$lib/helpers.svelte';
	import type { IBuiltMessage } from '$lib/types/messages.svelte';
	let { conversation_id } = $props<{
		conversation_id: string;
	}>();
	// Get the current user's ID from your auth system
	const currentUserId = $derived(user_store.getMe()?.id);

	const usersTyping = $derived(() => {
		const typing = conversation_store.getConversation(conversation_id)?.users_typing;
		return typing ? Array.from(typing) : [];
	});
	const typingMessage = $derived(() => {
		// Remove current user from the list if present
		const typingUsers = usersTyping();
		const otherUsersTyping = typingUsers
			.filter((id: string) => id !== currentUserId)
			.map((id: string) => user_store.getUser(id));

		const isCurrentUserTyping = typingUsers.includes(currentUserId);

		if (typingUsers.length === 0) {
			return '';
		} else if (isCurrentUserTyping && otherUsersTyping.length === 0) {
			return 'You are typing...';
		} else if (!isCurrentUserTyping) {
			if (otherUsersTyping.length === 1) {
				return `${otherUsersTyping[0]?.display_name} is typing...`;
			} else if (otherUsersTyping.length === 2) {
				return `${otherUsersTyping[0]?.display_name} and ${otherUsersTyping[1]?.display_name} are typing...`;
			} else if (otherUsersTyping.length === 3) {
				return `${otherUsersTyping[0]?.display_name}, ${otherUsersTyping[1]?.display_name}, and ${otherUsersTyping[2]?.display_name} are typing...`;
			} else {
				return `${otherUsersTyping.length} people are typing...`;
			}
		} else {
			if (otherUsersTyping.length === 1) {
				return `You and ${otherUsersTyping[0]?.display_name} are typing...`;
			} else if (otherUsersTyping.length === 2) {
				return `You, ${otherUsersTyping[0]?.display_name}, and ${otherUsersTyping[1]?.display_name} are typing...`;
			} else {
				return `You and ${otherUsersTyping.length} others are typing...`;
			}
		}
	});

	let messageContainer: HTMLDivElement;
	let isLoading = $state(false);
	let isLoadingMore = $state(false);
	let isAtBottom = $state(true);

	const messageGetter = getConversationMessages(conversation_id);
	let messages = $derived(() => {
		const msgs = messageGetter();
		if (!msgs || !Array.isArray(msgs)) {
			console.warn('Messages not yet loaded or invalid:', msgs);
			return [] as IBuiltMessage[];
		}
		return msgs;
	});

	// Ensure conversation exists in store
	$effect(() => {
		if (!conversation_store.getConversation(conversation_id)) {
			buildConversation(conversation_id).catch((error: Error) => {
				console.error('Failed to build conversation:', error);
			});
		}
	});

	// Scroll handling
	function handleScroll(event: Event) {
		const target = event.target as HTMLDivElement;
		const { scrollTop, scrollHeight, clientHeight } = target;
		isAtBottom = Math.abs(scrollHeight - clientHeight - scrollTop) < 10;

		// TODO: Implement infinite scroll when near top
		if (scrollTop === 0 && !isLoadingMore) {
			loadMoreMessages();
		}
	}

	async function loadMoreMessages() {
		isLoadingMore = true;
		try {
			// TODO: Implement pagination
			// const oldestMessageId = messages[0]?.id;
			// await loadMessages(oldestMessageId);
		} finally {
			isLoadingMore = false;
		}
	}

	function scrollToBottom() {
		messageContainer?.scrollTo({
			top: messageContainer.scrollHeight,
			behavior: 'smooth'
		});
	}

	async function uploadFile(file: File): Promise<string> {
		const uploadedFile = await file_api.uploadFile(file);
		return uploadedFile.id;
	}
</script>

<div class="relative flex h-full flex-col">
	{#if conversation_id}
		<ChatHeader {conversation_id} />
	{/if}

	<!-- Messages Area -->
	<div
		bind:this={messageContainer}
		class="absolute inset-0 {conversation_id
			? 'top-20'
			: 'top-0'} bottom-[73px] overflow-y-auto scroll-smooth px-4"
		onscroll={handleScroll}
	>
		{#if isLoading}
			<div class="flex h-full items-center justify-center">
				<Loader2 class="h-8 w-8 animate-spin" />
			</div>
		{:else}
			{#if isLoadingMore}
				<div class="flex justify-center py-4">
					<Loader2 class="h-4 w-4 animate-spin" />
				</div>
			{/if}

			<div class="space-y-2 py-6">
				{#if conversation_id}
					{#each messages() as message}
						{#if !message.parent_id}
							<ChatMessage message_id={message.id} {conversation_id} />
						{/if}
					{/each}
				{/if}
			</div>

			{#if !conversation_id || !messages()?.length}
				<div class="flex h-full items-center justify-center text-muted-foreground">
					No messages yet
				</div>
			{/if}
		{/if}
	</div>

	<!-- Scroll to Bottom Button -->
	{#if !isAtBottom}
		<div class="absolute bottom-[85px] right-6 z-10">
			<Button.Root
				variant="secondary"
				size="icon"
				class="rounded-full shadow-lg"
				onclick={() => scrollToBottom()}
			>
				<ArrowDown class="h-4 w-4" />
			</Button.Root>
		</div>
	{/if}

	<!-- Message Input -->
	<div
		class="absolute bottom-0 left-0 right-0 border-t bg-background/95 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/75"
	>
		<!-- Typing Indicator -->
		<div class="mb-2 text-sm text-muted-foreground">
			{#if conversation_id}
				{typingMessage()}
			{/if}
		</div>

		{#if conversation_id}
			<ChatInput {conversation_id} />
		{/if}
	</div>
</div>
