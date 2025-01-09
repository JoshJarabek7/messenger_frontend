<script lang="ts">
    import { MessageAPI } from "$lib/api/messages";
    import { FileAPI } from "$lib/api/files";
    import * as Popover from "$lib/components/ui/popover";
    import * as Button from "$lib/components/ui/button";
    import * as Card from "$lib/components/ui/card";
    import * as Accordion from "$lib/components/ui/accordion";
    import * as Tooltip from "$lib/components/ui/tooltip";
    import { MessageSquare, Smile, Plus } from "lucide-svelte";
    import type { FileAttachment, Reaction, Message } from "$lib/types";
    import { auth } from "$lib/stores/auth.svelte";
    import { messages } from "$lib/stores/messages.svelte";
    import Self from "./chat-message.svelte";
    import ChatInput from "./chat-input.svelte";

    console.log($auth.user)
    interface User {
        id: string;
        username: string;
        display_name?: string;
        avatar_url?: string;
    }

    interface ReactionGroup {
        emoji: string;
        users: User[];
    }

    let { message } = $props<{
        message: Message;
    }>();

    // Common emojis for quick reactions
    const quickEmojis = ["👍", "❤️", "😂", "🎉", "🚀"];
    const allEmojis = ["😀", "😂", "🥰", "😍", "🤔", "😮", "😢", "😡", "👍", "👎", "❤️", "🎉", "🔥", "💯", "🙏", "✨"];
    
    // Group reactions by emoji
    let reactionGroups = $state<ReactionGroup[]>([]);
    let availableQuickEmojis = $state<string[]>([]);
    let availableAllEmojis = $state<string[]>([]);
    
    $effect(() => {
        // Get all emojis currently used in reactions
        const usedEmojis = new Set(message.reactions.map((r: Reaction) => r.emoji));
        
        // Filter out used emojis from quick emojis and all emojis
        availableQuickEmojis = quickEmojis.filter(emoji => !usedEmojis.has(emoji));
        availableAllEmojis = allEmojis.filter(emoji => !usedEmojis.has(emoji));

        // Calculate reaction groups
        reactionGroups = message.reactions.reduce((groups: ReactionGroup[], reaction: Reaction) => {
            const existing = groups.find((g: ReactionGroup) => g.emoji === reaction.emoji);
            if (existing) {
                existing.users.push(reaction.user);
            } else {
                groups.push({ emoji: reaction.emoji, users: [reaction.user] });
            }
            return groups;
        }, [] as ReactionGroup[]);
    });

    let showReactionPicker = $state(false);
    let replies = $state<Message[]>([]);
    let isLoadingReplies = $state(false);
    let accordionValue = $state<string | undefined>(undefined);
    let replyContent = $state("");
    let hasInitiallyLoadedReplies = $state(false);

    // Load replies if there are any when the message is first loaded (only once)
    $effect(() => {
        if (!hasInitiallyLoadedReplies && message.reply_count > 0) {
            hasInitiallyLoadedReplies = true;
            loadReplies();
        }
    });

    function formatTime(date: string) {
        return new Date(date).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
        });
    }

    function formatFileSize(bytes: number) {
        const units = ['B', 'KB', 'MB', 'GB'];
        let size = bytes;
        let unitIndex = 0;
        
        while (size >= 1024 && unitIndex < units.length - 1) {
            size /= 1024;
            unitIndex++;
        }
        
        return `${size.toFixed(1)} ${units[unitIndex]}`;
    }

    async function handleReaction(emoji: string) {
        console.log('Handling reaction:', emoji, 'for message:', message.id);
        try {
            const currentUser = $auth.user;
            if (!currentUser) {
                console.log('No current user');
                return;
            }

            const existingReaction = message.reactions.find(
                (r: Reaction) => r.emoji === emoji && r.user.id === currentUser.id
            );

            console.log('Found existing reaction:', existingReaction);

            if (existingReaction) {
                console.log('Attempting to remove reaction:', existingReaction.id);
                try {
                    const updatedMessage = await MessageAPI.removeReaction(message.id, existingReaction.id);
                    console.log('Successfully removed reaction. New message state:', updatedMessage);
                    // Update both local state and store
                    message = updatedMessage;
                    messages.updateMessage(updatedMessage);
                } catch (error) {
                    console.error('Failed to remove reaction:', error);
                    return;
                }
            } else {
                console.log('Attempting to add reaction:', emoji);
                try {
                    const updatedMessage = await MessageAPI.addReaction(message.id, emoji);
                    console.log('Successfully added reaction. New message state:', updatedMessage);
                    // Update both local state and store
                    message = updatedMessage;
                    messages.updateMessage(updatedMessage);
                } catch (error) {
                    console.error('Failed to add reaction:', error);
                    return;
                }
            }
            
            // Force recomputation of reaction groups
            reactionGroups = message.reactions.reduce((groups: ReactionGroup[], reaction: Reaction) => {
                const existing = groups.find((g: ReactionGroup) => g.emoji === reaction.emoji);
                if (existing) {
                    existing.users.push(reaction.user);
                } else {
                    groups.push({ emoji: reaction.emoji, users: [reaction.user] });
                }
                return groups;
            }, [] as ReactionGroup[]);

            // Update available emojis
            const usedEmojis = new Set(message.reactions.map((r: Reaction) => r.emoji));
            availableQuickEmojis = quickEmojis.filter(emoji => !usedEmojis.has(emoji));
            availableAllEmojis = allEmojis.filter(emoji => !usedEmojis.has(emoji));

        } catch (error) {
            console.error('Error in handleReaction:', error);
        }
    }

    async function loadReplies() {
        if (isLoadingReplies) return;
        
        isLoadingReplies = true;
        try {
            replies = await MessageAPI.getThread(message.id);
        } catch (error) {
            console.error('Error loading replies:', error);
        } finally {
            isLoadingReplies = false;
        }
    }

    async function handleReply(event: CustomEvent<{ content: string }>) {
        try {
            const reply = await MessageAPI.reply(message.id, event.detail.content);
            replies = [...replies, reply];
        } catch (error) {
            console.error('Error sending reply:', error);
        }
    }

    function formatUserList(users: User[]): string {
        return users.map(u => u.display_name || u.username).join(', ');
    }

    async function handleDownload(file: FileAttachment) {
        try {
            const downloadUrl = await FileAPI.getDownloadUrl(file.id);
            window.open(downloadUrl, '_blank');
        } catch (error) {
            console.error('Error getting download URL:', error);
            alert('Failed to download file. Please try again.');
        }
    }
</script>

<div class="group flex items-start gap-4 px-2 py-3 -mx-2 rounded-lg hover:bg-muted/50">
    <div class="h-10 w-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
        {#if message.user.avatar_url}
            <img 
                src={message.user.avatar_url} 
                alt={message.user.username} 
                class="h-full w-full object-cover"
            />
        {:else}
            <span class="text-sm font-semibold">
                {message.user.username[0].toUpperCase()}
            </span>
        {/if}
    </div>
    <div class="min-w-0 flex-1">
        <div class="flex items-center gap-2 mb-0.5">
            <span class="font-semibold truncate">
                {message.user.display_name || message.user.username}
            </span>
            <span class="text-xs text-muted-foreground">
                {formatTime(message.created_at)}
            </span>
        </div>
        <div class="text-sm whitespace-pre-wrap break-words">
            {message.content}
        </div>

        <!-- File Attachments -->
        {#if message.attachments?.length}
            <div class="mt-2 space-y-2">
                {#each message.attachments as file}
                    <Card.Root class="p-3 flex items-center gap-3">
                        <div class="flex-1 min-w-0">
                            <p class="font-medium truncate">{file.original_filename}</p>
                            <p class="text-xs text-muted-foreground">{formatFileSize(file.file_size)}</p>
                        </div>
                        <Button.Root 
                            variant="outline" 
                            size="sm"
                            onclick={() => handleDownload(file)}
                        >
                            Download
                        </Button.Root>
                    </Card.Root>
                {/each}
            </div>
        {/if}

        <!-- Reactions -->
        <div class="mt-1 flex flex-wrap gap-1">
            {#each reactionGroups as group}
                <Button.Root 
                    variant={group.users.some(u => u.id === $auth.user?.id) ? "secondary" : "outline"}
                    size="sm" 
                    class="h-8 px-2 gap-1 items-center"
                    onclick={() => handleReaction(group.emoji)}
                >
                    <span class="text-xl">{group.emoji}</span>
                    <span class="text-muted-foreground">{group.users.length}</span>
                </Button.Root>
            {/each}
        </div>

        <!-- Reaction Toolbar (visible on hover) -->
        <div class="mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <div class="flex items-center gap-1">
                {#each availableQuickEmojis as emoji}
                    <Button.Root 
                        variant="ghost"
                        size="sm" 
                        class="h-8 w-8 p-0"
                        onclick={() => handleReaction(emoji)}
                    >
                        <span class="text-xl">{emoji}</span>
                    </Button.Root>
                {/each}
                
                <Popover.Root>
                    <Popover.Trigger>
                        <div>
                            <Button.Root variant="ghost" size="sm" class="h-8 w-8 p-0">
                                <Plus class="h-4 w-4" />
                            </Button.Root>
                        </div>
                    </Popover.Trigger>
                    <Popover.Content>
                        <div class="grid grid-cols-8 gap-2 p-2">
                            {#each availableAllEmojis as emoji}
                                <Button.Root 
                                    variant="ghost"
                                    size="sm"
                                    class="h-8 w-8 p-0"
                                    onclick={() => handleReaction(emoji)}
                                >
                                    <span class="text-xl">{emoji}</span>
                                </Button.Root>
                            {/each}
                        </div>
                    </Popover.Content>
                </Popover.Root>

            </div>
        </div>

        <!-- Thread/Replies -->
        <!-- {#if message.reply_count > 0 || replies.length > 0} -->
            <div class="mt-2">
                <Accordion.Root type="single" bind:value={accordionValue}>
                    <Accordion.Item value="replies">
                        <Accordion.Trigger class="flex items-center gap-2">
                            {#if isLoadingReplies}
                                <span class="text-sm">Loading replies...</span>
                            {:else}
                                <span class="text-sm">{replies.length} {replies.length === 1 ? 'reply' : 'replies'}</span>
                            {/if}
                        </Accordion.Trigger>
                        <Accordion.Content>
                            <div class="space-y-2 p-4 border-l-2 border-secondary border-dashed">
                                {#each replies as reply}
                                    <Self message={reply} />
                                {/each}
                                
                                <!-- Reply Input -->
                                <div class="mt-4">
                                    <ChatInput on:submit={handleReply} />
                                </div>
                            </div>
                        </Accordion.Content>
                    </Accordion.Item>
                </Accordion.Root>
            </div>
        <!-- {/if} -->
    </div>
</div> 