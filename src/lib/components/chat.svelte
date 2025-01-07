<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { websocket } from "$lib/stores/websocket";
    import ChatMessage from "./chat-message.svelte";
    import ChatInput from "./chat-input.svelte";
    import { Loader2 } from "lucide-svelte";

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

    onMount(() => {
        loadMessages();
        
        // Connect WebSocket and subscribe to channel
        websocket.connect();
        console.log('WebSocket connected');
        console.log(websocket.socket)

        const checkConnection = setInterval(() => {
            if (websocket.socket?.readyState === WebSocket.OPEN) {
                clearInterval(checkConnection);
                websocket.subscribeToChannel(chatId);
            }
        }, 100);
        
        // Listen for new messages
        const messageCleanup = websocket.onMessage('message_sent', (data) => {
            console.log('Received message:', data);
            if (data.channel_id === chatId) {
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
            websocket.unsubscribeFromChannel(chatId);
        };
    });

    onDestroy(() => {
        websocket.unsubscribeFromChannel(chatId);
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
            const endpoint = chatType === 'channel' 
                ? `http://localhost:8000/api/channels/${chatId}/messages` 
                : `http://localhost:8000/api/messages/direct/${chatId}`;
            
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
        }
    }

    async function handleSendMessage(event: CustomEvent<{ content: string }>) {
        try {
            const endpoint = chatType === 'channel'
                ? `http://localhost:8000/api/channels/${chatId}/messages`
                : `http://localhost:8000/api/messages/direct/${chatId}`;

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
        if (target.scrollTop === 0 && hasMore && !isLoadingMore) {
            loadMessages(true);
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

    <!-- Message Input -->
    <div class="absolute bottom-0 left-0 right-0 px-4 py-4 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <ChatInput on:submit={handleSendMessage} />
    </div>
</div> 