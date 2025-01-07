<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { auth } from "$lib/stores/auth.svelte";
    import { workspace } from "$lib/stores/workspace.svelte";
    import { websocket } from "$lib/stores/websocket.svelte";
    import { goto } from "$app/navigation";
    import * as Button from "$lib/components/ui/button";
    import { CaretLeft, CaretRight, List, Hash, User, Plus } from "phosphor-svelte";
    import UserSearch from "$lib/components/user-search.svelte";
    import DashboardHeader from "$lib/components/dashboard-header.svelte";
    import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "$lib/components/ui/dropdown-menu";

    export let data;
    
    let isSidebarCollapsed = false;
    let isMobileMenuOpen = false;
    let isUserSearchOpen = false;

    $: user = $auth.user ? {
        name: $auth.user.username,
        email: $auth.user.email,
        avatar_url: $auth.user.avatar_url
    } : null;

    function toggleSidebar() {
        isSidebarCollapsed = !isSidebarCollapsed;
    }

    function handleCreateWorkspace() {
        goto("/dashboard/workspace/new");
    }

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

    function handleMobileMenuClick() {
        isMobileMenuOpen = true;
    }

    function handleOpenUserSearch() {
        handleOpenChange(true);
    }
</script>

<div class="flex flex-col h-screen">
    <DashboardHeader {user} />
    
    <div class="flex-1 flex overflow-hidden">
        <!-- Desktop Sidebar -->
        <aside class="hidden md:flex flex-col {isSidebarCollapsed ? 'w-16' : 'w-64'} bg-muted/50 border-r border-border transition-all duration-200">
            <div class="flex items-center justify-between p-4 h-14">
                <Button.Root variant="ghost" size="icon" class="ml-auto" onclick={toggleSidebar}>
                    {#if isSidebarCollapsed}
                        <CaretRight class="h-4 w-4" />
                    {:else}
                        <CaretLeft class="h-4 w-4" />
                    {/if}
                </Button.Root>
            </div>

            <nav class="flex-1 overflow-y-auto">
                <!-- Workspaces -->
                <div class="px-4 py-2">
                    <div class="flex items-center justify-between mb-2">
                        {#if !isSidebarCollapsed}
                            <h2 class="text-sm font-semibold">Workspaces</h2>
                        {/if}
                        <Button.Root variant="ghost" size="icon" onclick={handleCreateWorkspace}>
                            <Plus class="h-4 w-4" />
                        </Button.Root>
                    </div>
                </div>

                <!-- Direct Messages -->
                <div class="px-4 py-2">
                    <div class="flex items-center justify-between mb-2">
                        {#if !isSidebarCollapsed}
                            <h2 class="text-sm font-semibold">Direct Messages</h2>
                        {/if}
                        <Button.Root variant="ghost" size="icon" onclick={handleOpenUserSearch}>
                            <Plus class="h-4 w-4" />
                        </Button.Root>
                    </div>
                </div>
            </nav>
        </aside>

        <!-- Mobile Menu Button -->
        <button
            type="button"
            class="md:hidden fixed bottom-4 right-4 bg-primary text-primary-foreground rounded-full p-4 shadow-lg"
            onclick={handleMobileMenuClick}
        >
            <List class="h-6 w-6" />
        </button>

        <!-- Main Content -->
        <main class="flex-1 overflow-y-auto bg-background">
            <slot />
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