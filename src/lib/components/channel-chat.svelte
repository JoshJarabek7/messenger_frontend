<script lang="ts">
    import Chat from "./chat.svelte";

    let { channelId } = $props<{
        channelId: string;
    }>();
</script>

<Chat chatId={channelId} chatType="PUBLIC" /> 