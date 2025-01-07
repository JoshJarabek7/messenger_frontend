<script lang="ts">
    import * as Dialog from "$lib/components/ui/dialog";
    import * as Tabs from "$lib/components/ui/tabs";
    import { Input } from "$lib/components/ui/input";
    import { MagnifyingGlass, Spinner } from "phosphor-svelte";
    import { search } from "$lib/stores/search";
    import * as Avatar from "$lib/components/ui/avatar";
    import { goto } from "$app/navigation";
    import { conversations } from "$lib/stores/conversations.svelte";
    import { workspace } from "$lib/stores/workspace.svelte";
    import { workspaces } from "$lib/stores/workspaces.svelte";

    let { open, onOpenChange } = $props<{
        open: boolean;
        onOpenChange: (value: boolean) => void;
    }>();

    let searchQuery = $state("");
    let activeTab = $state("workspaces");
    let joiningWorkspace = $state<string | null>(null);
    let joinError = $state<string | null>(null);

    let debounceTimer: ReturnType<typeof setTimeout>;
    function handleSearch(event: Event) {
        const query = (event.target as HTMLInputElement).value;
        searchQuery = query;

        if (!query) {
            search.clearResults();
            return;
        }

        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            search.search(query);
        }, 300);
    }

    async function handleWorkspaceSelect(workspaceId: string) {
        try {
            joiningWorkspace = workspaceId;
            joinError = null;

            const response = await fetch(`http://localhost:8000/api/workspaces/${workspaceId}/join`, {
                method: 'POST',
                credentials: 'include'
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Failed to join workspace');
            }
            
            const data = await response.json();
            
            // Refresh the workspaces list
            await workspaces.refresh();
            
            // Set the active workspace
            await workspace.setActiveWorkspace(data.id);
            
            // Clear search results and close dialog
            search.clearResults();
            searchQuery = "";
            onOpenChange(false);
        } catch (error) {
            console.error('Error joining workspace:', error);
            joinError = error instanceof Error ? error.message : 'Failed to join workspace';
        } finally {
            joiningWorkspace = null;
        }
    }

    function handleUserSelect(user: {
        id: string;
        username: string;
        display_name?: string;
        avatar_url?: string;
    }) {
        conversations.addTemporaryConversation(user);
        conversations.setActiveConversation(user.id);
        search.clearResults();
        searchQuery = "";
        onOpenChange(false);
    }
</script>

<Dialog.Root {open} onOpenChange={onOpenChange}>
    <Dialog.Content class="sm:max-w-[600px]">
        <Dialog.Header>
            <Dialog.Title>Search</Dialog.Title>
            <Dialog.Description>
                Search for workspaces and users
            </Dialog.Description>
        </Dialog.Header>

        <div class="flex items-center space-x-2 py-4">
            <div class="relative flex-1">
                <MagnifyingGlass class="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                    class="pl-9"
                    placeholder="Search..."
                    value={searchQuery}
                    oninput={handleSearch}
                />
            </div>
        </div>

        {#if joinError}
            <div class="mb-4 p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                {joinError}
            </div>
        {/if}

        {#if $search.error}
            <div class="mb-4 p-3 text-sm text-destructive bg-destructive/10 rounded-md">
                {$search.error}
            </div>
        {/if}

        <Tabs.Root value={activeTab} onValueChange={(value) => activeTab = value} class="mt-2">
            <Tabs.List>
                <Tabs.Trigger value="workspaces">Workspaces</Tabs.Trigger>
                <Tabs.Trigger value="users">Users</Tabs.Trigger>
            </Tabs.List>
            
            {#if searchQuery && $search.results}
                {#if $search.isLoading}
                    <div class="p-4 text-sm text-muted-foreground text-center">
                        <div class="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
                        <p class="mt-2">Searching...</p>
                    </div>
                {:else}
                    <Tabs.Content value="workspaces" class="mt-4">
                        {#if $search.results.workspaces.length === 0}
                            <p class="text-center text-sm text-muted-foreground py-4">No workspaces found</p>
                        {:else}
                            <div class="space-y-2">
                                {#each $search.results.workspaces as workspace}
                                    <button
                                        class="w-full flex items-center gap-2 p-3 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                                        onclick={() => handleWorkspaceSelect(workspace.id)}
                                        disabled={workspace.is_member || joiningWorkspace === workspace.id}
                                    >
                                        {#if workspace.icon_url}
                                            <img src={workspace.icon_url} alt={workspace.name} class="h-8 w-8 rounded" />
                                        {:else}
                                            <div class="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
                                                {workspace.name[0].toUpperCase()}
                                            </div>
                                        {/if}
                                        <div class="flex flex-col flex-1">
                                            <span>{workspace.name}</span>
                                            {#if workspace.is_member}
                                                <span class="text-xs text-muted-foreground">Already a member</span>
                                            {:else if joiningWorkspace === workspace.id}
                                                <span class="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Spinner class="h-3 w-3 animate-spin" />
                                                    Joining...
                                                </span>
                                            {/if}
                                        </div>
                                    </button>
                                {/each}
                            </div>
                        {/if}
                    </Tabs.Content>

                    <Tabs.Content value="users" class="mt-4">
                        {#if $search.results.users.length === 0}
                            <p class="text-center text-sm text-muted-foreground py-4">No users found</p>
                        {:else}
                            <div class="space-y-2">
                                {#each $search.results.users as user}
                                    <button
                                        class="w-full flex items-center gap-2 p-3 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors text-left"
                                        onclick={() => handleUserSelect(user)}
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
                                            </div>
                                        </div>
                                    </button>
                                {/each}
                            </div>
                        {/if}
                    </Tabs.Content>
                {/if}
            {/if}
        </Tabs.Root>
    </Dialog.Content>
</Dialog.Root> 