<script lang="ts">
    import { MessageAPI } from "$lib/api/messages";
    import * as Popover from "$lib/components/ui/popover";
    import * as Button from "$lib/components/ui/button";
    import * as Card from "$lib/components/ui/card";
    import * as Accordion from "$lib/components/ui/accordion";
    import { MessageSquare, Smile, Plus } from "lucide-svelte";
    import type { FileAttachment, Reaction } from "$lib/types";
    import { auth } from "$lib/stores/auth.svelte";
    import Self from "./chat-message.svelte";

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
        attachments: FileAttachment[];
        reactions: Reaction[];
        parent_id?: string;
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
    
    // Group reactions by emoji
    let reactionGroups = $state<ReactionGroup[]>([]);
    $effect(() => {
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
    let showReplies = $state(false);
    let accordionValue = $state<string | undefined>(undefined);

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
        try {
            const currentUser = $auth.user;
            if (!currentUser) return;

            const existingReaction = message.reactions.find(
                (r: Reaction) => r.emoji === emoji && r.user.id === currentUser.id
            );

            if (existingReaction) {
                await MessageAPI.removeReaction(message.id, existingReaction.id);
            } else {
                await MessageAPI.addReaction(message.id, emoji);
            }
        } catch (error) {
            console.error('Error handling reaction:', error);
        }
    }

    async function loadReplies() {
        if (isLoadingReplies) return;
        
        isLoadingReplies = true;
        try {
            replies = await MessageAPI.getThread(message.id);
            showReplies = true;
            accordionValue = 'replies';
        } catch (error) {
            console.error('Error loading replies:', error);
        } finally {
            isLoadingReplies = false;
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
                        <Button.Root variant="outline" size="sm">
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
                    variant="outline" 
                    size="sm" 
                    class="h-6 px-2 gap-1 text-xs"
                    onclick={() => handleReaction(group.emoji)}
                >
                    <span>{group.emoji}</span>
                    <span>{group.users.length}</span>
                </Button.Root>
            {/each}
        </div>

        <!-- Reaction Toolbar (visible on hover) -->
        <div class="mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <div class="flex items-center gap-1">
                {#each quickEmojis as emoji}
                    <Button.Root 
                        variant="ghost" 
                        size="sm" 
                        class="h-7 w-7 p-0"
                        onclick={() => handleReaction(emoji)}
                    >
                        {emoji}
                    </Button.Root>
                {/each}
                
                <Popover.Root>
                    <Popover.Trigger>
                        <Button.Root variant="ghost" size="sm" class="h-7 w-7 p-0">
                            <Plus class="h-4 w-4" />
                        </Button.Root>
                    </Popover.Trigger>
                    <Popover.Content>
                        <div class="grid grid-cols-8 gap-2 p-2">
                            {#each ["😀", "😂", "🥰", "😍", "🤔", "😮", "😢", "😡", "👍", "👎", "❤️", "🎉", "🔥", "💯", "🙏", "✨"] as emoji}
                                <button 
                                    class="hover:bg-muted p-1 rounded"
                                    onclick={() => handleReaction(emoji)}
                                >
                                    {emoji}
                                </button>
                            {/each}
                        </div>
                    </Popover.Content>
                </Popover.Root>

                <!-- Reply Button -->
                <Button.Root 
                    variant="ghost" 
                    size="sm" 
                    class="h-7 gap-1"
                    onclick={loadReplies}
                >
                    <MessageSquare class="h-4 w-4" />
                    {#if replies.length}
                        <span class="text-xs">{replies.length}</span>
                    {/if}
                </Button.Root>
            </div>
        </div>

        <!-- Thread/Replies -->
        {#if showReplies && replies.length > 0}
            <Accordion.Root type="single" bind:value={accordionValue}>
                <Accordion.Item value="replies">
                    <Accordion.Trigger>
                        {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
                    </Accordion.Trigger>
                    <Accordion.Content>
                        <div class="space-y-2 pt-2">
                            {#each replies as reply}
                                <Self message={reply} />
                            {/each}
                        </div>
                    </Accordion.Content>
                </Accordion.Item>
            </Accordion.Root>
        {/if}
    </div>
</div> 