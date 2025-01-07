<script lang="ts">
    import * as Button from "$lib/components/ui/button";
    import { PaperPlaneRight } from "phosphor-svelte";
    import { createEventDispatcher } from "svelte";

    const dispatch = createEventDispatcher<{
        submit: { content: string };
    }>();

    let message = $state("");

    function handleSubmit(event: SubmitEvent) {
        event.preventDefault();
        if (!message.trim()) return;
        dispatch('submit', { content: message.trim() });
        message = "";
    }

    function handleKeyDown(event: KeyboardEvent) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleSubmit(new SubmitEvent('submit'));
        }
    }
</script>

<form 
    class="flex items-center gap-3" 
    onsubmit={handleSubmit}
>
    <input
        type="text"
        placeholder="Type a message..."
        bind:value={message}
        onkeydown={handleKeyDown}
        class="flex-1 h-11 px-4 rounded-md border bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
    />
    <Button.Root type="submit" size="icon" variant="default" class="h-11 w-11">
        <PaperPlaneRight weight="bold" class="h-5 w-5" />
    </Button.Root>
</form> 