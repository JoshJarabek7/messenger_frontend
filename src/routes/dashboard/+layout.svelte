<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { goto } from "$app/navigation";
    import { auth } from "$lib/stores/auth.svelte";
    import { workspace } from "$lib/stores/workspace.svelte";
    import { websocket } from "$lib/stores/websocket";
    import DashboardHeader from "$lib/components/dashboard-header.svelte";
    import UserSearch from "$lib/components/user-search.svelte";
    import AppSidebar from "$lib/components/app-sidebar.svelte";
    import Chat from "$lib/components/chat.svelte";
    import { conversations } from "$lib/stores/conversations.svelte";
    import { workspaces } from "$lib/stores/workspaces.svelte";

    export let data;
    
    let isUserSearchOpen = false;
    let isSidebarCollapsed = false;
    let refreshInterval: ReturnType<typeof setInterval>;
    let currentUser: any;

    async function refreshToken() {
        try {
            const response = await fetch('http://localhost:8000/api/auth/refresh', {
                method: 'POST',
                credentials: 'include'
            });
            
            if (!response.ok) {
                console.error('Failed to refresh token');
                // If refresh fails, redirect to login
                auth.logout();
                goto('/login');
            }
        } catch (error) {
            console.error('Error refreshing token:', error);
            auth.logout();
            goto('/login');
        }
    }

    onMount(async () => {
        // Initialize workspaces store with data from the server
        workspaces.set(data.workspaces);
        conversations.loadConversations();

        // Set up token refresh interval (every 60 seconds)
        refreshInterval = setInterval(refreshToken, 60 * 1000);
        
        // Initial token refresh
        await refreshToken();

    });

    onDestroy(() => {
        if (refreshInterval) {
            clearInterval(refreshInterval);
        }
    });

    // $: user = $auth.user ? {
    //     name: $auth.user.username,
    //     email: $auth.user.email,
    //     avatar_url: $auth.user.avatar_url
    // } : null;
    $: currentUser = data.user;

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
        <DashboardHeader user={currentUser} />
        <!-- Main Content -->
        <main class="flex-1 bg-background">
            {#if $workspace.activeChannelId}
                <Chat chatId={$workspace.activeChannelId} chatType="channel" />
            {:else if $conversations.activeConversationUserId}
                <Chat chatId={$conversations.activeConversationUserId} chatType="direct" />
            {:else}
                <div class="flex items-center justify-center h-full text-muted-foreground">
                    Select a channel or start a conversation to begin chatting
                </div>
            {/if}
        </main>
    </div>
</div>

<!-- User Search Dialog -->
<UserSearch
    open={isUserSearchOpen}
    onOpenChange={handleOpenChange}
/>

<style>
    :global(body) {
        overflow: hidden;
    }
</style>