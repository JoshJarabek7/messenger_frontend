<script lang="ts">
    import * as Sidebar from "$lib/components/ui/sidebar";
    import { Plus, House, Chat, CaretLeft, CaretRight, Hash } from "phosphor-svelte";
    import { workspace } from "$lib/stores/workspace.svelte";
    import * as Button from "$lib/components/ui/button";
    import * as Avatar from "$lib/components/ui/avatar";
    import { createEventDispatcher, onMount } from 'svelte';
    import WorkspaceCreateDialog from "./workspace-create-dialog.svelte";
    import { conversations } from "$lib/stores/conversations.svelte";

    interface Workspace {
        id: string;
        name: string;
        icon_url?: string;
    }

    interface Channel {
        id: string;
        name: string;
        workspace_id: string;
        description?: string;
        is_private: boolean;
        created_at: string;
    }

    let { workspaces = [], recentDms = [], onOpenUserSearch } = $props<{
        workspaces: Workspace[];
        recentDms: any[];
        onOpenUserSearch: () => void;
    }>();

    let isCollapsed = $state(false);
    let isWorkspaceDialogOpen = $state(false);

    const dispatch = createEventDispatcher();

    async function handleSelectWorkspace(workspaceItem: Workspace) {
        await workspace.setActiveWorkspace(workspaceItem.id);
    }

    function handleSelectChannel(channel: Channel) {
        workspace.setActiveChannel(channel.id);
    }

    function handleSelectDm(userId: string) {
        workspace.setActiveDm(userId);
        workspace.setActiveChannel(null);
        workspace.setActiveWorkspace(null);
    }

    async function handleCreateChannel() {
        if (!$workspace.activeWorkspaceId) return;
        try {
            const name = prompt('Enter channel name:');
            if (!name) return;

            const response = await fetch(`http://localhost:8000/api/workspaces/${$workspace.activeWorkspaceId}/channels`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name: name.trim() }),
                credentials: 'include'
            });

            if (!response.ok) throw new Error('Failed to create channel');
            const newChannel = await response.json();
            workspace.setActiveChannel(newChannel.id);
        } catch (error) {
            console.error('Error creating channel:', error);
        }
    }

</script>

<div class="flex h-screen {isCollapsed ? 'w-1/3' : ''}">
<Sidebar.Provider>
    <Sidebar.Root collapsible="offcanvas" on:collapsed={(e: CustomEvent<boolean>) => {
        isCollapsed = e.detail;
        dispatch('collapseChange', { isCollapsed });
    }}>
        <Sidebar.Header>
            <div class="relative flex items-center justify-between {isCollapsed ? 'p-4' : ''}">
                <div class="flex-shrink-0">
                    <Sidebar.Trigger let:props let:open>
                        <Button.Root variant="ghost" size="icon" {...props}>
                            {#if open}
                                <CaretLeft size={16} />
                            {:else}
                                <CaretRight size={16} />
                            {/if}
                        </Button.Root>
                    </Sidebar.Trigger>
                </div>
            </div>
        </Sidebar.Header>

        <Sidebar.Content>
            <Sidebar.Group>
                <Sidebar.GroupLabel>Workspaces</Sidebar.GroupLabel>
                <Sidebar.GroupContent>
                    <Sidebar.Menu>
                        {#each workspaces as workspaceItem}
                            <Sidebar.MenuItem>
                                <Sidebar.MenuButton 
                                    onclick={() => handleSelectWorkspace(workspaceItem)}
                                    isActive={$workspace.activeWorkspaceId === workspaceItem.id}
                                >
                                    {#if workspaceItem.icon_url}
                                        <img src={workspaceItem.icon_url} alt={workspaceItem.name} class="h-4 w-4 rounded" />
                                    {:else}
                                        <House class="h-4 w-4" />
                                    {/if}
                                    <span>{workspaceItem.name}</span>
                                </Sidebar.MenuButton>
                            </Sidebar.MenuItem>
                        {/each}
                        <Sidebar.MenuItem>
                            <Sidebar.MenuButton onclick={() => isWorkspaceDialogOpen = true}>
                                <Plus class="h-4 w-4" />
                                <span>Create Workspace</span>
                            </Sidebar.MenuButton>
                        </Sidebar.MenuItem>
                    </Sidebar.Menu>
                </Sidebar.GroupContent>
            </Sidebar.Group>

            {#if $workspace.activeWorkspaceId}
                <Sidebar.Separator />

                <Sidebar.Group>
                    <Sidebar.GroupLabel>Channels</Sidebar.GroupLabel>
                    <Sidebar.GroupContent>
                        <Sidebar.Menu>
                            {#each $workspace.channels as channel}
                                <Sidebar.MenuItem>
                                    <Sidebar.MenuButton 
                                        onclick={() => handleSelectChannel(channel)}
                                        isActive={$workspace.activeChannelId === channel.id}
                                    >
                                        <Hash class="h-4 w-4" />
                                        <span>{channel.name}</span>
                                    </Sidebar.MenuButton>
                                </Sidebar.MenuItem>
                            {/each}
                            <Sidebar.MenuItem>
                                <Sidebar.MenuButton onclick={handleCreateChannel}>
                                    <Plus class="h-4 w-4" />
                                    <span>Create Channel</span>
                                </Sidebar.MenuButton>
                            </Sidebar.MenuItem>
                        </Sidebar.Menu>
                    </Sidebar.GroupContent>
                </Sidebar.Group>
            {/if}

            <Sidebar.Separator />

            <Sidebar.Group>
                <Sidebar.GroupLabel>Direct Messages</Sidebar.GroupLabel>
                <Sidebar.GroupContent>
                    <Sidebar.Menu>
                        {#each $conversations.conversations as conversation}
                            <Sidebar.MenuItem>
                                <Sidebar.MenuButton 
                                    onclick={() => {
                                        handleSelectDm(conversation.user.id);
                                        conversations.setActiveConversation(conversation.user.id);
                                    }}
                                    isActive={$conversations.activeConversationUserId === conversation.user.id}
                                >
                                    <Avatar.Root class="h-6 w-6">
                                        <Avatar.Image 
                                            src={conversation.user.avatar_url} 
                                            alt={conversation.user.display_name || conversation.user.username} 
                                        />
                                        <Avatar.Fallback>
                                            {(conversation.user.display_name || conversation.user.username)[0].toUpperCase()}
                                        </Avatar.Fallback>
                                    </Avatar.Root>
                                    <span>{conversation.user.display_name || conversation.user.username}</span>
                                    {#if conversation.is_temporary}
                                        <span class="ml-2 text-xs text-muted-foreground">(Draft)</span>
                                    {/if}
                                </Sidebar.MenuButton>
                            </Sidebar.MenuItem>
                        {/each}
                        <Sidebar.MenuItem>
                            <Sidebar.MenuButton onclick={onOpenUserSearch}>
                                <Plus class="h-4 w-4" />
                                <span>New Message</span>
                            </Sidebar.MenuButton>
                        </Sidebar.MenuItem>
                    </Sidebar.Menu>
                </Sidebar.GroupContent>
            </Sidebar.Group>
        </Sidebar.Content>
    </Sidebar.Root>
</Sidebar.Provider> 

<WorkspaceCreateDialog bind:open={isWorkspaceDialogOpen} />
</div>