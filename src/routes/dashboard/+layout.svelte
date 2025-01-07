<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { auth } from "$lib/stores/auth.svelte";
    import { workspace } from "$lib/stores/workspace.svelte";
    import { websocket } from "$lib/stores/websocket";
    import DashboardHeader from "$lib/components/dashboard-header.svelte";
    import UserSearch from "$lib/components/user-search.svelte";
    import AppSidebar from "$lib/components/app-sidebar.svelte";
    import ChannelChat from "$lib/components/channel-chat.svelte";
    import { workspaces } from "$lib/stores/workspaces.svelte";

    export let data;
    
    let isUserSearchOpen = false;
    let isSidebarCollapsed = false;

    onMount(async () => {
        // Initialize workspaces store with data from the server
        workspaces.set(data.workspaces);
    });

    $: user = $auth.user ? {
        name: $auth.user.username,
        email: $auth.user.email,
        avatar_url: $auth.user.avatar_url
    } : null;

    async function handleSelectUser(userId: string) {
        try {
            const response = await fetch('http://localhost:8000/api/channels/dm', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ user_id: userId }),
                credentials: 'include'
            });

            if (!response.ok) throw new Error('Failed to create DM');
            
            const channel: { id: string } = await response.json();
            isUserSearchOpen = false;
            if (channel && channel.id) {
                workspace.setActiveDm(channel.id);
            }
        } catch (error) {
            console.error('Error creating DM:', error);
        }
    }

    function handleOpenChange(value: boolean) {
        isUserSearchOpen = value;
    }

    function handleOpenUserSearch() {
        handleOpenChange(true);
    }

    function handleSidebarCollapseChange(event: CustomEvent<{ isCollapsed: boolean }>) {
        isSidebarCollapsed = event.detail.isCollapsed;
    }
</script>

<div class="flex h-screen">
    <AppSidebar 
        workspaces={$workspaces} 
        recentDms={data.recentDms}
        onOpenUserSearch={handleOpenUserSearch}
        on:collapseChange={handleSidebarCollapseChange}
    />
    <div class="flex-1 flex flex-col min-w-0">
        <DashboardHeader {user} />
        <!-- Main Content -->
        <main class="flex-1 bg-background">
            {#if $workspace.activeChannelId}
                <ChannelChat channelId={$workspace.activeChannelId} />
            {:else}
                <div class="flex items-center justify-center h-full text-muted-foreground">
                    Select a channel to start chatting
                </div>
            {/if}
        </main>
    </div>
</div>

<!-- User Search Dialog -->
<UserSearch
    open={isUserSearchOpen}
    onOpenChange={handleOpenChange}
    onSelectUser={handleSelectUser}
/>

<style>
    :global(body) {
        @apply overflow-hidden;
    }
</style>