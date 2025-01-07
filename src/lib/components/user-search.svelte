<script lang="ts">
    import * as Dialog from "$lib/components/ui/dialog";
    import { Input } from "$lib/components/ui/input";
    import { User, MagnifyingGlass } from "phosphor-svelte";
    import { workspace } from "$lib/stores/workspace.svelte";

    export let open = false;
    export let onOpenChange: (value: boolean) => void;
    export let onSelectUser: (userId: string) => void;

    let searchResults: Array<{
        id: string;
        username: string;
        display_name?: string;
        avatar_url?: string;
    }> = [];
    let isLoading = false;

    async function searchUsers(query: string) {
        if (!query) {
            searchResults = [];
            return;
        }

        isLoading = true;
        try {
            const params = new URLSearchParams({
                query,
                ...(workspace.state.activeWorkspaceId && {
                    workspace_id: workspace.state.activeWorkspaceId
                })
            });

            const response = await fetch(`http://localhost:8000/api/users/search?${params}`, {
                credentials: 'include'
            });
            
            if (!response.ok) throw new Error('Failed to search users');
            
            searchResults = await response.json();
        } catch (error) {
            console.error('Error searching users:', error);
            searchResults = [];
        } finally {
            isLoading = false;
        }
    }

    let debounceTimer: number;
    function handleSearch(event: Event) {
        const query = (event.target as HTMLInputElement).value;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => searchUsers(query), 300);
    }
</script>

<Dialog.Root {open} onOpenChange={onOpenChange}>
    <Dialog.Content class="sm:max-w-[425px]">
        <Dialog.Header>
            <Dialog.Title>Start Direct Message</Dialog.Title>
            <Dialog.Description>
                Search for a user to start a conversation.
            </Dialog.Description>
        </Dialog.Header>

        <div class="flex items-center space-x-2 py-4">
            <div class="relative flex-1">
                <MagnifyingGlass class="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                    class="pl-9"
                    placeholder="Search users..."
                    oninput={handleSearch}
                />
            </div>
        </div>

        <div class="max-h-[300px] overflow-y-auto">
            {#if isLoading}
                <div class="p-4 text-center text-sm text-muted-foreground">
                    Searching...
                </div>
            {:else if searchResults.length === 0}
                <div class="p-4 text-center text-sm text-muted-foreground">
                    No users found.
                </div>
            {:else}
                <div class="space-y-1">
                    {#each searchResults as user (user.id)}
                        <button
                            class="w-full flex items-center gap-2 p-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
                            onclick={() => onSelectUser(user.id)}
                        >
                            {#if user.avatar_url}
                                <img
                                    src={user.avatar_url}
                                    alt={user.display_name || user.username}
                                    class="h-8 w-8 rounded-full"
                                />
                            {:else}
                                <div class="h-8 w-8 rounded-full bg-secondary flex items-center justify-center text-secondary-foreground">
                                    {(user.display_name || user.username)[0].toUpperCase()}
                                </div>
                            {/if}
                            <div class="flex flex-col items-start">
                                <span class="font-medium">{user.display_name || user.username}</span>
                                {#if user.display_name}
                                    <span class="text-sm text-muted-foreground">@{user.username}</span>
                                {/if}
                            </div>
                        </button>
                    {/each}
                </div>
            {/if}
        </div>
    </Dialog.Content>
</Dialog.Root> 