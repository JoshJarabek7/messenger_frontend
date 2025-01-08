<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { websocket } from "$lib/stores/websocket.svelte";
    import ChatMessage from "./chat-message.svelte";
    import ChatInput from "./chat-input.svelte";
    import { Loader2, ArrowDown } from "lucide-svelte";
    import * as Button from "$lib/components/ui/button";
    import { conversations } from "$lib/stores/conversations.svelte.ts";
    import type { Message, Conversation, User, ChatType } from "$lib/types";
    import { ConversationAPI } from "$lib/api/conversations";
    import { MessageAPI } from "$lib/api/messages";

    type LocalConversation = Conversation & { is_temporary?: boolean };

    let { chatId, chatType } = $props<{
        chatId: string;
        chatType?: ChatType;
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

    let cleanupWebsocket: (() => void) | undefined;

    onMount(() => {
        const init = async () => {
            shouldAutoScroll = true;
            
            if (chatType === 'DIRECT') {
                // For DMs, first check if a conversation exists or create a temporary one
                const existingConv = ($conversations.conversations as LocalConversation[]).find(c => 
                    c.conversation_type === 'DIRECT' && 
                    (c.participant_2?.id === chatId || c.participant_1?.id === chatId)
                );
                
                if (existingConv?.id) {
                    conversationId = existingConv.id;
                    await loadMessages();
                } else {
                    // Add temporary conversation and clear messages
                    conversations.addTemporaryConversation({ id: chatId } as User);
                    messages = [];
                    isLoading = false;
                }
            } else {
                // For channels, we already have the conversation ID
                conversationId = chatId;
                await loadMessages();
            }
            
            // Connect WebSocket and subscribe to channel
            websocket.connect();
            
            let checkConnectionInterval: number;
            const checkConnection = setInterval(() => {
                if (websocket.socket?.readyState === WebSocket.OPEN) {
                    clearInterval(checkConnectionInterval);
                    if (conversationId) {
                        websocket.subscribeToChannel(conversationId);
                    }
                }
            }, 100);
            checkConnectionInterval = checkConnection;
            
            // Listen for new messages
            const messageCleanup = websocket.onMessage('message_sent', (data) => {
                console.log('Received message:', data);
                if (data.conversation_id === conversationId) {
                    // Check if message already exists
                    if (!messages.some(m => m.id === data.id)) {
                        messages = [...messages, data];
                        // Scroll to bottom for new messages
                        setTimeout(scrollToBottom, 0);
                    }
                }
            });

            cleanupWebsocket = () => {
                clearInterval(checkConnectionInterval);
                messageCleanup();
                if (conversationId) {
                    websocket.unsubscribeFromChannel(conversationId);
                }
            };
        };

        init();
    });

    onDestroy(() => {
        cleanupWebsocket?.();
    });

    async function loadMessages(loadMore = false) {
        if (!conversationId || (loadMore && (!hasMore || isLoadingMore))) return;
        
        if (loadMore) {
            isLoadingMore = true;
            page += 1;
        } else {
            isLoading = true;
            page = 1;  // Reset page when loading fresh
        }

        try {
            const newMessages = await ConversationAPI.getMessages(conversationId, undefined, PAGE_SIZE);
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
            
            // Send the message
            const messageData = await MessageAPI.send(conversationId!, chatType, event.detail.content);
            
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
        onscroll={handleScroll}
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