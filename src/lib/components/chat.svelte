<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { websocket } from "$lib/stores/websocket";
    import ChatMessage from "./chat-message.svelte";
    import ChatInput from "./chat-input.svelte";
    import { Loader2, ArrowDown } from "lucide-svelte";
    import * as Button from "$lib/components/ui/button";

    interface User {
        id: string;
        username: string;
        display_name?: string;
        avatar_url?: string;
    }

    interface Message {
        id: string;
        content: string;
        user: User;
        created_at: string;
        updated_at: string;
    }

    let { chatId, chatType = 'channel' } = $props<{
        chatId: string;
        chatType?: 'channel' | 'direct';
    }>();

    let messages = $state<Message[]>([]);
    let messageContainer: HTMLDivElement;
    let isLoading = $state(true);
    let isLoadingMore = $state(false);
    let hasMore = $state(true);
    let page = $state(1);
    const PAGE_SIZE = 50;

    let cleanup: (() => void) | undefined;
    let isAtBottom = $state(true);
    let conversationId = $state<string | null>(null);
    let shouldAutoScroll = $state(true);
    
    function checkIfAtBottom() {
        if (!messageContainer) return true;
        const threshold = 100; // pixels from bottom to consider "at bottom"
        const position = messageContainer.scrollHeight - messageContainer.scrollTop - messageContainer.clientHeight;
        return position < threshold;
    }

    $effect(() => {
        if (messages && messageContainer && shouldAutoScroll) {
            scrollToBottom();
        }
    });

    onMount(() => {
        shouldAutoScroll = true;
        loadMessages();
        
        // Connect WebSocket and subscribe to channel
        websocket.connect();
        console.log('WebSocket connected');
        console.log("Logging websocket")
        console.log(websocket.socket)

        const checkConnection = setInterval(() => {
            if (websocket.socket?.readyState === WebSocket.OPEN) {
                clearInterval(checkConnection);
                // For DMs, we need to wait for the conversation ID
                if (chatType === 'channel') {
                    websocket.subscribeToChannel(chatId);
                }
            }
        }, 100);
        
        // Listen for new messages
        const messageCleanup = websocket.onMessage('message_sent', (data) => {
            console.log('Received message:', data);
            // For DMs, check conversation ID instead of channel ID
            const targetId = chatType === 'channel' ? chatId : conversationId;
            if (data.conversation_id === targetId || data.channel_id === targetId) {
                // Check if message already exists
                if (!messages.some(m => m.id === data.id)) {
                    messages = [...messages, data];
                    // Scroll to bottom for new messages
                    setTimeout(scrollToBottom, 0);
                }
            }
        });

        return () => {
            clearInterval(checkConnection);
            messageCleanup();
            if (chatType === 'channel') {
                websocket.unsubscribeFromChannel(chatId);
            } else if (conversationId) {
                websocket.unsubscribeFromChannel(conversationId);
            }
        };
    });

    onDestroy(() => {
        if (chatType === 'channel') {
            websocket.unsubscribeFromChannel(chatId);
        } else if (conversationId) {
            websocket.unsubscribeFromChannel(conversationId);
        }
    });

    $effect(() => {
        // Subscribe to conversation when ID is available
        if (chatType === 'direct' && conversationId && websocket.socket?.readyState === WebSocket.OPEN) {
            websocket.subscribeToChannel(conversationId);
        }
    });

    async function loadMessages(loadMore = false) {
        if (loadMore) {
            if (!hasMore || isLoadingMore) return;
            isLoadingMore = true;
            page += 1;
        } else {
            isLoading = true;
            page = 1;  // Reset page when loading fresh
        }

        try {
            let endpoint;
            if (chatType === 'channel') {
                endpoint = `http://localhost:8000/api/channels/${chatId}/messages`;
            } else {
                // For DMs, first get or create the conversation
                if (!conversationId) {
                    const conversationResponse = await fetch(`http://localhost:8000/api/direct-messages`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            recipient_id: chatId
                        }),
                        credentials: 'include'
                    });

                    if (!conversationResponse.ok) {
                        throw new Error('Failed to get conversation');
                    }
                    const conversation = await conversationResponse.json();
                    conversationId = conversation.id;
                }
                endpoint = `http://localhost:8000/api/direct-messages/${conversationId}/messages`;
            }
            
            const response = await fetch(`${endpoint}?page=${page}&page_size=${PAGE_SIZE}`, {
                credentials: 'include'
            });
            
            if (!response.ok) throw new Error('Failed to fetch messages');
            
            const newMessages = await response.json();
            hasMore = newMessages.length === PAGE_SIZE;
            
            if (loadMore) {
                messages = [...messages, ...newMessages];
            } else {
                messages = newMessages;
                scrollToBottom();
            }
        } catch (error) {
            console.error('Error fetching messages:', error);
        } finally {
            isLoading = false;
            isLoadingMore = false;
        }
    }

    function scrollToBottom() {
        if (messageContainer) {
            messageContainer.scrollTop = messageContainer.scrollHeight;
            isAtBottom = true;
        }
    }

    async function handleSendMessage(event: CustomEvent<{ content: string }>) {
        try {
            let endpoint;
            if (chatType === 'channel') {
                endpoint = `http://localhost:8000/api/channels/${chatId}/messages`;
            } else {
                // For DMs, first create or get the conversation if we don't have it
                if (!conversationId) {
                    const conversationResponse = await fetch(`http://localhost:8000/api/direct-messages`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            recipient_id: chatId
                        }),
                        credentials: 'include'
                    });

                    if (!conversationResponse.ok) {
                        const error = await conversationResponse.json();
                        throw new Error(error.detail || 'Failed to create direct message conversation');
                    }
                    const conversation = await conversationResponse.json();
                    conversationId = conversation.id;
                }
                
                // Use the conversation ID for sending messages
                endpoint = `http://localhost:8000/api/direct-messages/${conversationId}/messages`;
            }

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    content: event.detail.content
                }),
                credentials: 'include'
            });

            if (!response.ok) throw new Error('Failed to send message');
            const messageData = await response.json();
            
            // Add message immediately to the UI
            if (!messages.some(m => m.id === messageData.id)) {
                messages = [...messages, messageData];
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
</script>

<div class="flex flex-col h-full relative">
    <!-- Messages Area -->
    <div 
        bind:this={messageContainer}
        class="absolute inset-0 bottom-[73px] overflow-y-auto px-4 scroll-smooth"
        on:scroll={handleScroll}
    >
        {#if isLoading}
            <div class="flex items-center justify-center h-full">
                <Loader2 class="h-8 w-8 animate-spin" />
            </div>
        {:else}
            {#if isLoadingMore}
                <div class="flex justify-center py-4">
                    <Loader2 class="h-4 w-4 animate-spin" />
                </div>
            {/if}
            
            <div class="space-y-2 py-6">
                {#each messages as message (message.id)}
                    <ChatMessage {message} />
                {/each}
            </div>

            {#if messages.length === 0}
                <div class="flex items-center justify-center h-full text-muted-foreground">
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
    <div class="absolute bottom-0 left-0 right-0 px-4 py-4 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <ChatInput on:submit={handleSendMessage} />
    </div>
</div> 