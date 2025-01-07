<script lang="ts">
    import * as Sidebar from "$lib/components/ui/sidebar";
    import { Plus, House, Chat, CaretLeft, CaretRight, Hash } from "phosphor-svelte";
    import { workspace } from "$lib/stores/workspace.svelte";
    import * as Button from "$lib/components/ui/button";
    import * as Avatar from "$lib/components/ui/avatar";
    import { createEventDispatcher } from 'svelte';
    import WorkspaceCreateDialog from "./workspace-create-dialog.svelte";
    import { conversations } from "$lib/stores/conversations.svelte";

    interface Channel {
        id: string;
        name: string;
        workspace_id: string;
    }

    let { workspaces = [], recentDms = [], onOpenUserSearch } = $props<{
        workspaces: any[];
        recentDms: any[];
        onOpenUserSearch: () => void;
    }>();

    let selectedWorkspace = $state<any>(null);
    let selectedChannel = $state<Channel | null>(null);
    let channels = $state<Channel[]>([]);
    let isCollapsed = $state(false);
    let isWorkspaceDialogOpen = $state(false);

    const dispatch = createEventDispatcher();

    async function handleSelectWorkspace(workspace: any) {
        selectedWorkspace = workspace;
        selectedChannel = null;
        // Fetch channels for the selected workspace
        try {
            const response = await fetch(`http://localhost:8000/api/workspaces/${workspace.id}/channels`, {
                credentials: 'include'
            });
            if (!response.ok) throw new Error('Failed to fetch channels');
            channels = await response.json();
        } catch (error) {
            console.error('Error fetching channels:', error);
            channels = [];
        }
    }

    async function handleCreateChannel() {
        if (!selectedWorkspace) return;
        try {
            const name = prompt('Enter channel name:');
            if (!name) return;

            const response = await fetch(`http://localhost:8000/api/workspaces/${selectedWorkspace.id}/channels`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name: name.trim() }),
                credentials: 'include'
            });

            if (!response.ok) throw new Error('Failed to create channel');
            const newChannel = await response.json();
            channels = [...channels, newChannel];
            selectedChannel = newChannel;
        } catch (error) {
            console.error('Error creating channel:', error);
        }
    }

    function handleSelectChannel(channel: Channel) {
        selectedChannel = channel;
    }

    $effect(() => {
        if (selectedChannel) {
            workspace.setActiveChannel(selectedChannel.id);
        } else {
            workspace.setActiveChannel(null);
        }
    });
</script>

<div class="flex h-screen {isCollapsed ? 'w-1/3' : ''}">


<Sidebar.Provider>
    <Sidebar.Root collapsible="icon" on:collapsed={(e: CustomEvent<boolean>) => {
        isCollapsed = e.detail;
        dispatch('collapseChange', { isCollapsed });
    }}>
        <Sidebar.Header>
            <div class="relative flex items-center justify-between {isCollapsed ? 'p-4' : ''}">
                <div class="flex-shrink-0">
                    <Sidebar.Trigger>
                        {#snippet trigger({ props }: { props: { open?: boolean } })}
                            <Button.Root variant="ghost" size="icon" {...props}>
                                {(props.open ? CaretLeft : CaretRight)({ size: 16 })}
                            </Button.Root>
                        {/snippet}
                    </Sidebar.Trigger>
                </div>
            </div>
        </Sidebar.Header>

        <Sidebar.Content>
            <Sidebar.Group>
                <Sidebar.GroupLabel>Workspaces</Sidebar.GroupLabel>
                <Sidebar.GroupContent>
                    <Sidebar.Menu>
                        {#each workspaces as workspace}
                            <Sidebar.MenuItem>
                                <Sidebar.MenuButton 
                                    onclick={() => handleSelectWorkspace(workspace)}
                                    isActive={selectedWorkspace?.id === workspace.id}
                                >
                                    {#if workspace.icon_url}
                                        <img src={workspace.icon_url} alt={workspace.name} class="h-4 w-4 rounded" />
                                    {:else}
                                        <House class="h-4 w-4" />
                                    {/if}
                                    <span>{workspace.name}</span>
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

            {#if selectedWorkspace}
                <Sidebar.Separator />

                <Sidebar.Group>
                    <Sidebar.GroupLabel>Channels</Sidebar.GroupLabel>
                    <Sidebar.GroupContent>
                        <Sidebar.Menu>
                            {#each channels as channel}
                                <Sidebar.MenuItem>
                                    <Sidebar.MenuButton 
                                        onclick={() => handleSelectChannel(channel)}
                                        isActive={selectedChannel?.id === channel.id}
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
                                    onclick={() => conversations.setActiveConversation(conversation.user.id)}
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