<script lang="ts">
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

    let { message } = $props<{
        message: Message;
    }>();

    function formatTime(date: string) {
        return new Date(date).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: true 
        });
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
    </div>
</div> 