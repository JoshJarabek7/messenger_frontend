<script lang="ts">
    import * as Avatar from "$lib/components/ui/avatar";
    import * as Button from "$lib/components/ui/button";
    import * as DropdownMenu from "$lib/components/ui/dropdown-menu";
    import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "$lib/components/ui/command";
    import { MagnifyingGlass, User } from "phosphor-svelte";
    import { auth } from "$lib/stores/auth.svelte";
    import { search } from "$lib/stores/search.svelte";
    import { goto } from "$app/navigation";
    import { cn } from "$lib/utils";

    export let user: { name: string; email: string; avatar_url?: string } | null = null;

    let searchQuery = "";
    let isSearchOpen = false;

    function handleLogout() {
        auth.logout();
        goto("/");
    }

    function handleSettings() {
        goto("/dashboard/settings");
    }

    let searchDebounceTimer: ReturnType<typeof setTimeout>;
    function handleSearch(event: Event) {
        const query = (event.target as HTMLInputElement).value;
        searchQuery = query;

        if (!query) {
            search.clearResults();
            return;
        }

        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
            search.search(query);
            isSearchOpen = true;
        }, 300);
    }
</script>

<div class="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
    <div class="flex h-14 items-center px-4 gap-4">
        <Command class="rounded-lg border shadow-md">
            <CommandInput 
                placeholder="Search organizations and users..."
                value={searchQuery}
                oninput={handleSearch}
                class="max-w-md"
            />
            {#if searchQuery && $search.results}
                <CommandList>
                    {#if $search.isLoading}
                        <div class="p-4 text-sm text-muted-foreground text-center">
                            <div class="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full mx-auto" />
                            <p class="mt-2">Searching...</p>
                        </div>
                    {:else}
                        {#if $search.results.workspaces.length > 0}
                            <CommandGroup heading="Workspaces">
                                {#each $search.results.workspaces as workspace}
                                    <CommandItem 
                                        onclick={() => {
                                            search.clearResults();
                                            searchQuery = "";
                                            goto(`/dashboard/workspace/${workspace.id}`);
                                        }}
                                    >
                                        <div class="flex items-center gap-2">
                                            {#if workspace.icon_url}
                                                <img src={workspace.icon_url} alt={workspace.name} class="h-5 w-5 rounded" />
                                            {:else}
                                                <div class="h-5 w-5 rounded bg-primary/10 flex items-center justify-center">
                                                    {workspace.name[0].toUpperCase()}
                                                </div>
                                            {/if}
                                            <span>{workspace.name}</span>
                                        </div>
                                    </CommandItem>
                                {/each}
                            </CommandGroup>
                        {/if}

                        {#if $search.results.users.length > 0}
                            <CommandGroup heading="Users">
                                {#each $search.results.users as user}
                                    <CommandItem 
                                        onclick={() => {
                                            search.clearResults();
                                            searchQuery = "";
                                            // TODO: Open user profile or start DM
                                        }}
                                    >
                                        <div class="flex items-center gap-2">
                                            <Avatar.Root class="h-5 w-5">
                                                <Avatar.Image 
                                                    src={user.avatar_url} 
                                                    alt={user.display_name || user.username} 
                                                />
                                                <Avatar.Fallback>
                                                    {(user.display_name || user.username)[0].toUpperCase()}
                                                </Avatar.Fallback>
                                            </Avatar.Root>
                                            <span>{user.display_name || user.username}</span>
                                            {#if user.display_name}
                                                <span class="text-xs text-muted-foreground">@{user.username}</span>
                                            {/if}
                                        </div>
                                    </CommandItem>
                                {/each}
                            </CommandGroup>
                        {/if}

                        {#if $search.results.users.length === 0 && $search.results.workspaces.length === 0}
                            <CommandEmpty>No results found.</CommandEmpty>
                        {/if}
                    {/if}
                </CommandList>
            {/if}
        </Command>
        
        {#if user}
            <DropdownMenu.Root>
                <DropdownMenu.Trigger>
                    <Button.Root variant="ghost" class="h-8 w-8 rounded-full">
                        <Avatar.Root class="h-8 w-8">
                            <Avatar.Image src={user.avatar_url} alt={user.name} />
                            <Avatar.Fallback>
                                <User class="h-4 w-4" />
                            </Avatar.Fallback>
                        </Avatar.Root>
                    </Button.Root>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content>
                    <div class="flex items-center justify-start gap-2 p-2">
                        <div class="flex flex-col space-y-1">
                            <p class="text-sm font-medium leading-none">{user.name}</p>
                            <p class="text-xs leading-none text-muted-foreground">{user.email}</p>
                        </div>
                    </div>
                    <DropdownMenu.Item onclick={handleSettings}>Settings</DropdownMenu.Item>
                    <DropdownMenu.Item onclick={handleLogout}>Log out</DropdownMenu.Item>
                </DropdownMenu.Content>
            </DropdownMenu.Root>
        {:else}
            <Button.Root variant="ghost" class="h-8 w-8 rounded-full" onclick={() => goto("/login")}>
                <Avatar.Root class="h-8 w-8">
                    <Avatar.Fallback>
                        <User class="h-4 w-4" />
                    </Avatar.Fallback>
                </Avatar.Root>
            </Button.Root>
        {/if}
    </div>
</div> 