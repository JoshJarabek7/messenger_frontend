<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { websocket } from '$lib/stores/websocket.svelte';
	import ChatMessage from './chat-message.svelte';
	import ChatInput from './chat-input.svelte';
	import { Loader2, ArrowDown } from 'lucide-svelte';
	import * as Button from '$lib/components/ui/button';
	import { conversations } from '$lib/stores/conversations.svelte.ts';
	import { ConversationAPI } from '$lib/api/conversations';
	import { MessageAPI } from '$lib/api/messages';
	import { messages } from '$lib/stores/messages.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { presence } from '$lib/stores/presence.svelte';

	let { chatId, chatType } = $props<{
		chatId: string;
		chatType: 'PUBLIC' | 'DIRECT';
	}>();

	let messageContainer: HTMLDivElement;
	let isLoading = $state(false);
	let isLoadingMore = $state(false);
	let page = $state(1);
	let hasMore = $state(true);
	let conversationId = $state<string | null>(null);
	let typingUsers = $state<string[]>([]);
	let shouldAutoScroll = $state(true);
	let isAtBottom = $state(true);
	const PAGE_SIZE = 50;
	let previousChatId = $state<string | null>(null);

	// Handle chat ID changes
	$effect(() => {
		const authUser = $auth.user;
		if (!authUser) {
			console.log('No auth user yet, waiting...');
			return;
		}

		// Prevent duplicate loading of the same chat
		if (previousChatId === chatId) {
			console.log('Skipping duplicate chat load for:', chatId);
			return;
		}

		console.log('Chat ID changed:', chatId);
		console.log('Chat type:', chatType);
		previousChatId = chatId;

		// Reset state
		hasMore = true;
		page = 1;
		shouldAutoScroll = true;

		// For public chats, use the chatId directly
		if (chatType === 'PUBLIC') {
			console.log('Setting conversation ID for public chat:', chatId);
			conversationId = chatId;

			// Subscribe to the conversation if WebSocket is ready
			if (websocket.socket?.readyState === WebSocket.OPEN) {
				console.log('WebSocket is open, subscribing to channel');
				websocket.subscribeToChannel(chatId);
			} else {
				console.log('WebSocket not ready, waiting for connection');
				// Set up a one-time event listener for WebSocket open
				const handleOpen = () => {
					console.log('WebSocket now open, subscribing to channel');
					websocket.subscribeToChannel(chatId);
				};
				websocket.socket?.addEventListener('open', handleOpen, { once: true });
			}
		} else {
			// For DMs, we need to either get or create the conversation
			console.log('Getting/creating DM conversation for:', chatId);
			initializeDirectMessage();
		}
	});

	async function initializeDirectMessage() {
		try {
			// First check if we already have this conversation in our store
			const existingConversation =
				conversations.state.conversations.find(
					(c) => c.conversation_type === 'DIRECT' && c.id === chatId // First check if this is the actual conversation ID
				) ||
				conversations.state.conversations.find(
					(c) =>
						c.conversation_type === 'DIRECT' &&
						((c.participant_1?.id === chatId && c.participant_2?.id === $auth.user?.id) ||
							(c.participant_2?.id === chatId && c.participant_1?.id === $auth.user?.id))
				);

			if (existingConversation) {
				console.log('Using existing conversation:', existingConversation.id);
				conversationId = existingConversation.id;

				// Always subscribe to the conversation channel
				console.log('Subscribing to existing conversation channel:', existingConversation.id);
				websocket.subscribeToChannel(existingConversation.id);
				return;
			}

			// Only create a new conversation if we couldn't find an existing one
			console.log('No existing conversation found, creating new DM conversation');
			const conversation = await ConversationAPI.createDM(chatId);
			console.log('Created new DM conversation:', conversation.id);
			conversationId = conversation.id;
			conversations.updateConversation(conversation.id, conversation);

			// Subscribe to the new conversation
			console.log('Subscribing to new conversation channel:', conversation.id);
			websocket.subscribeToChannel(conversation.id);
		} catch (error) {
			console.error('Error initializing DM:', error);
		}
	}

	// Scroll handling
	$effect(() => {
		if (messageContainer && shouldAutoScroll) {
			scrollToBottom();
		}
	});

	function checkIfAtBottom() {
		if (!messageContainer) return true;
		const threshold = 100; // pixels from bottom to consider "at bottom"
		const position =
			messageContainer.scrollHeight - messageContainer.scrollTop - messageContainer.clientHeight;
		return position < threshold;
	}

	function scrollToBottom() {
		if (messageContainer) {
			messageContainer.scrollTop = messageContainer.scrollHeight;
			isAtBottom = true;
		}
	}

	async function handleSendMessage(event: CustomEvent<{ content: string; fileIds?: string[] }>) {
		try {
			console.log(
				'Sending message with content:',
				event.detail.content,
				'and files:',
				event.detail.fileIds
			);

			if (chatType === 'DIRECT' && !conversationId) {
				// Create new DM conversation
				const conversation = await ConversationAPI.createDM(chatId);
				conversationId = conversation.id;
				conversations.removeTemporaryConversation(chatId);
				conversations.updateConversation(conversation.id, conversation);

				// Subscribe to the new conversation
				if (websocket.socket?.readyState === WebSocket.OPEN) {
					websocket.subscribeToChannel(conversation.id);
				}
			}

			if (!conversationId) return;

			// Send the message
			const messageData = await MessageAPI.sendMessage(
				conversationId,
				event.detail.content,
				event.detail.fileIds
			);

			console.log('Message sent successfully:', messageData);

			// Add message immediately to the UI
			messages.addMessage(messageData);
			// Update the conversation with the new message
			conversations.updateConversationWithMessage(messageData);
			// Scroll to bottom
			setTimeout(scrollToBottom, 0);
		} catch (error) {
			console.error('Error sending message:', error);
		}
	}

	function handleScroll(event: Event) {
		const target = event.target as HTMLDivElement;
		// Check if we're at the top for loading more messages
		if (target.scrollTop === 0 && hasMore && !isLoadingMore) {
			shouldAutoScroll = false;
			loadMoreMessages();
		}
		// Update isAtBottom state
		isAtBottom = checkIfAtBottom();
		// Update shouldAutoScroll based on if we're at bottom
		if (isAtBottom) {
			shouldAutoScroll = true;
		}
	}

	async function loadMoreMessages() {
		if (!conversationId || isLoadingMore) return;

		isLoadingMore = true;
		try {
			const newMessages = await MessageAPI.getMessages(conversationId, page + 1, PAGE_SIZE);
			if (newMessages.length > 0) {
				// Add new messages to the store
				messages.setMessagesForConversation(conversationId, newMessages);
				page += 1;
			}
			hasMore = newMessages.length === PAGE_SIZE;
		} catch (error) {
			console.error('Error loading more messages:', error);
		} finally {
			isLoadingMore = false;
		}
	}

	// Get typing users
	$effect(() => {
		const authUser = $auth.user;
		typingUsers = presence.getTypingUsers(chatId, authUser?.id);
	});

	function formatTypingMessage(userIds: string[]): string {
		if (userIds.length === 0) return '';

		const users = userIds.map((id) => {
			const user = messages.state.participants[id];
			return user?.display_name || user?.username || 'Someone';
		});

		if (users.length === 1) {
			return `${users[0]} is typing...`;
		} else if (users.length === 2) {
			return `${users[0]} and ${users[1]} are typing...`;
		} else {
			return `${users[0]} and ${users.length - 1} others are typing...`;
		}
	}
</script>

<div class="relative flex h-full flex-col">
	<!-- Messages Area -->
	<div
		bind:this={messageContainer}
		class="absolute inset-0 bottom-[73px] overflow-y-auto scroll-smooth px-4"
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
				{#if conversationId}
					{#each messages.getMessagesForConversation(conversationId) as message (message.id)}
						<ChatMessage {message} />
					{/each}
				{/if}
			</div>

			{#if !conversationId || messages.getMessagesForConversation(conversationId).length === 0}
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
				onclick={scrollToBottom}
			>
				<ArrowDown class="h-4 w-4" />
			</Button.Root>
		</div>
	{/if}

	<!-- Message Input -->
	<div
		class="absolute bottom-0 left-0 right-0 border-t bg-background/95 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/75"
	>
		{#if conversationId}
			<ChatInput {conversationId} on:submit={handleSendMessage} />
		{/if}
	</div>

	<!-- Typing Indicator -->
	{#if typingUsers.length > 0}
		<div class="px-4 py-2 text-sm text-muted-foreground">
			{formatTypingMessage(typingUsers)}
		</div>
	{/if}
</div>
