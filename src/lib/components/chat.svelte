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
		messages.clear();
		isLoading = false; // Reset loading state before starting new load
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
				// Load messages after subscription
				loadMessages().catch((error) => {
					console.error('Error loading messages:', error);
					isLoading = false;
				});
			} else {
				console.log('WebSocket not ready, waiting for connection');
				// Set up a one-time event listener for WebSocket open
				const handleOpen = () => {
					console.log('WebSocket now open, subscribing to channel');
					websocket.subscribeToChannel(chatId);
					// Load messages after subscription
					loadMessages().catch((error) => {
						console.error('Error loading messages:', error);
						isLoading = false;
					});
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
			// Try to find existing DM conversation
			const conversation = await ConversationAPI.createDM(chatId);
			console.log('Got DM conversation:', conversation);
			conversationId = conversation.id;
			conversations.updateConversation(conversation.id, conversation);

			// Subscribe to the conversation
			if (websocket.socket?.readyState === WebSocket.OPEN) {
				websocket.subscribeToChannel(conversation.id);
			}

			// Load messages
			loadMessages();
		} catch (error) {
			console.error('Error initializing DM:', error);
			isLoading = false;
		}
	}

	// Scroll handling
	$effect(() => {
		const messageState = messages.state;
		if (messageState.messages && messageContainer && shouldAutoScroll) {
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

	async function loadMessages(loadMore = false) {
		console.log('loadMessages called with loadMore:', loadMore);
		console.log('Current state - isLoading:', isLoading, 'isLoadingMore:', isLoadingMore);

		if (loadMore && (!hasMore || isLoadingMore)) {
			console.log('Skipping load more - hasMore:', hasMore, 'isLoadingMore:', isLoadingMore);
			return;
		}

		if (!conversationId) {
			console.log('No conversation ID, cannot load messages');
			isLoading = false;
			isLoadingMore = false;
			return;
		}

		// Set loading state if not already loading
		if (loadMore && !isLoadingMore) {
			isLoadingMore = true;
		} else if (!loadMore && !isLoading) {
			isLoading = true;
		}

		try {
			console.log('Loading messages for conversation:', conversationId);
			const newMessages = await MessageAPI.getMessages(conversationId, page, PAGE_SIZE);
			console.log('Loaded messages with full data:', JSON.stringify(newMessages, null, 2));
			console.log('Checking for attachments in messages:');
			newMessages.forEach((msg, index) => {
				if (msg.attachments?.length) {
					console.log(
						`Message ${index} has ${msg.attachments.length} attachments:`,
						msg.attachments
					);
				}
			});

			if (loadMore) {
				messages.setMessages([...messages.state.messages, ...newMessages]);
				page += 1;
			} else {
				messages.setMessages(newMessages);
				scrollToBottom();
			}
			hasMore = newMessages.length === PAGE_SIZE;
			console.log('Updated state - hasMore:', hasMore, 'page:', page);
		} catch (error) {
			console.error('Error loading messages:', error);
			throw error;
		} finally {
			console.log('Clearing loading states');
			isLoading = false;
			isLoadingMore = false;
		}
	}

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
			if (!messages.state.messages.some((m) => m.id === messageData.id)) {
				messages.setMessages([...messages.state.messages, messageData]);
				// Scroll to bottom
				setTimeout(scrollToBottom, 0);
			}
		} catch (error) {
			console.error('Error sending message:', error);
		}
	}

	function handleScroll(event: Event) {
		const target = event.target as HTMLDivElement;
		// Check if we're at the top for loading more messages
		if (target.scrollTop === 0 && hasMore && !isLoadingMore) {
			shouldAutoScroll = false;
			loadMessages(true);
		}
		// Update isAtBottom state
		isAtBottom = checkIfAtBottom();
		// Update shouldAutoScroll based on if we're at bottom
		if (isAtBottom) {
			shouldAutoScroll = true;
		}
	}

	// Get typing users
	$effect(() => {
		const authUser = $auth.user;
		typingUsers = presence.getTypingUsers(chatId, authUser?.id);
	});
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
				{#each messages.state.messages as message (message.id)}
					<ChatMessage {message} />
				{/each}
			</div>

			{#if messages.state.messages.length === 0}
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
