<script lang="ts">
    import * as Dialog from "$lib/components/ui/dialog";
    import * as Avatar from "$lib/components/ui/avatar";
    import { Input } from "$lib/components/ui/input";
    import { MagnifyingGlass } from "phosphor-svelte";
    import { workspace } from "$lib/stores/workspace.svelte";
    import { conversations } from "$lib/stores/conversations.svelte";
    import type { User } from "$lib/types";

    export let open = false;
    export let onOpenChange: (value: boolean) => void;
    export let currentUserId: string;

    let searchQuery = "";
    let searchResults: User[] = [];
    let isLoading = false;
    let error: string | null = null;


    let searchDebounceTimer: ReturnType<typeof setTimeout>;
    function handleSearch(event: Event) {
        const query = (event.target as HTMLInputElement).value;
        searchQuery = query;

        if (!query) {
            searchResults = [];
            return;
        }

        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
            searchUsers(query);
        }, 300);
    }

    async function searchUsers(query: string) {
        if (!query) return;
        
        isLoading = true;
        error = null;
        try {
            const response = await fetch(`http://localhost:8000/api/search/global?query=${encodeURIComponent(query)}&search_type=users`, {
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error('Failed to search users');
            }
            
            const data = await response.json();
            searchResults = (data.users || []).map((user: any) => ({
                id: user.id,
                username: user.username,
                display_name: user.display_name || user.username,
                email: user.email || '',
                avatar_url: user.avatar_url
            }));
        } catch (err) {
            console.error('Error searching users:', err);
            error = err instanceof Error ? err.message : 'Failed to search users';
            searchResults = [];
        } finally {
            isLoading = false;
        }
    }

    async function handleUserSelect(user: User) {
        if (user.id === currentUserId) return;
        
        // Clear active workspace, channel, and DM
        workspace.setActiveWorkspace(null);
        workspace.setActiveChannel(null);
        workspace.setActiveDm(null);
        
        // Add temporary conversation and set it as active
        conversations.addTemporaryConversation(user);
        conversations.setActiveConversation(user.id);
        
        // Clear search and close dialog
        searchQuery = "";
        onOpenChange(false);
    }
</script>

<Dialog.Root {open} onOpenChange={onOpenChange}>
    <Dialog.Content class="sm:max-w-[600px]">
        <Dialog.Header>
            <Dialog.Title>Start Direct Message</Dialog.Title>
            <Dialog.Description>
                Search for a user to start a conversation
            </Dialog.Description>
        </Dialog.Header>

        <div class="flex items-center space-x-2 py-4">
            <div class="relative flex-1">
                <MagnifyingGlass class="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                    class="pl-9"
                    placeholder="Search users..."
                    value={searchQuery}
                    oninput={handleSearch}
                />
            </div>
        </div>

        {#if error}
            <div class="mb-4 p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                {error}
            </div>
        {/if}

        <div class="max-h-[400px] overflow-y-auto">
            {#if searchQuery && isLoading}
                <div class="p-4 text-sm text-muted-foreground text-center">
                    <div class="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
                    <p class="mt-2">Searching...</p>
                </div>
            {:else if searchQuery && searchResults.length === 0}
                <p class="text-center text-sm text-muted-foreground py-4">No users found</p>
            {:else if searchQuery}
                <div class="space-y-2">
                    {#each searchResults as user}
                        <button
                            class="w-full flex items-center gap-2 p-3 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                            onclick={() => handleUserSelect(user)}
                            disabled={user.id === currentUserId}
                        >
                            <Avatar.Root class="h-8 w-8">
                                <Avatar.Image 
                                    src={user.avatar_url} 
                                    alt={user.display_name || user.username} 
                                />
                                <Avatar.Fallback>
                                    {(user.display_name || user.username)[0].toUpperCase()}
                                </Avatar.Fallback>
                            </Avatar.Root>
                            <div class="flex flex-col min-w-0">
                                <span class="truncate">{user.display_name || user.username}</span>
                                <div class="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span class="truncate">@{user.username}</span>
                                    {#if user.email}
                                        <span class="shrink-0">•</span>
                                        <span class="truncate">{user.email}</span>
                                    {/if}
                                    {#if user.id === currentUserId}
                                        <span class="shrink-0">•</span>
                                        <span class="truncate text-muted-foreground">This is you</span>
                                    {/if}
                                </div>
                            </div>
                        </button>
                    {/each}
                </div>
            {/if}
        </div>
    </Dialog.Content>
</Dialog.Root>