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
    import SearchDialog from "./search-dialog.svelte";

    export let user: { id: string; username: string; display_name: string; email: string; avatar_url?: string } | null = null;
    console.log(`user: ${user?.display_name}`);

    let searchQuery = "";
    let isSearchOpen = false;
    let isSearchDialogOpen = false;

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
        <Button.Root variant="ghost" size="icon" onclick={() => isSearchDialogOpen = true}>
            <MagnifyingGlass class="h-5 w-5" />
        </Button.Root>

        <SearchDialog 
            open={isSearchDialogOpen} 
            onOpenChange={(value) => isSearchDialogOpen = value} 
        />
        
        <div class="ml-auto">
            {#if user}
                <DropdownMenu.Root>
                    <DropdownMenu.Trigger>
                        <Button.Root variant="ghost" class="h-8 w-8 rounded-full">
                            <Avatar.Root class="h-8 w-8">
                                <Avatar.Image src={user.avatar_url} alt={user.display_name} />
                                <Avatar.Fallback>
                                    <User class="h-4 w-4" />
                                </Avatar.Fallback>
                            </Avatar.Root>
                        </Button.Root>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content>
                        <div class="flex items-center justify-start gap-2 p-2">
                            <div class="flex flex-col space-y-1">
                                <p class="text-sm font-medium leading-none">{user.display_name}</p>
                                <p class="text-xs leading-none text-muted-foreground">{user.email}</p>
                            </div>
                        </div>
                        <DropdownMenu.Item onSelect={handleSettings}>Settings</DropdownMenu.Item>
                        <DropdownMenu.Item onSelect={handleLogout}>Log out</DropdownMenu.Item>
                    </DropdownMenu.Content>
                </DropdownMenu.Root>
                {/if}
        </div>
    </div>
</div> 