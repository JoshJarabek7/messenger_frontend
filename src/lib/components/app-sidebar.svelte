<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar';
	import { Plus, House, CaretLeft, CaretRight, Hash } from 'phosphor-svelte';
	import { workspace } from '$lib/stores/workspace.svelte.ts';
	import * as Button from '$lib/components/ui/button';
	import * as Avatar from '$lib/components/ui/avatar';
	import { createEventDispatcher } from 'svelte';
	import WorkspaceCreateDialog from './workspace-create-dialog.svelte';
	import { conversations } from '$lib/stores/conversations.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import type { Channel, Workspace } from '$lib/types';

	let {
		workspaces = [],
		recentDms = [],
		onOpenUserSearch
	} = $props<{
		workspaces: Workspace[];
		recentDms: any[];
		onOpenUserSearch: () => void;
	}>();

	let isCollapsed = $state(false);
	let isWorkspaceDialogOpen = $state(false);

	const dispatch = createEventDispatcher();

	function handleWorkspaceCreated(event: CustomEvent<{ workspace: Workspace }>) {
		workspaces = [...workspaces, event.detail.workspace];
		dispatch('workspaceListChanged');
		isWorkspaceDialogOpen = false;
	}

	async function handleSelectWorkspace(workspaceItem: Workspace) {
		try {
			await workspace.setActiveWorkspace(workspaceItem.id);
			conversations.clearActiveConversation();
		} catch (error) {
			console.error('Error selecting workspace:', error);
			// Error is already handled in the workspace store
		}
	}

	function handleSelectChannel(channel: Channel) {
		workspace.setActiveChannel(channel.id);
		conversations.clearActiveConversation();
	}

	function handleSelectDm(userId: string) {
		workspace.setActiveDm(userId);
		workspace.setActiveChannel(null);
		workspace.setActiveWorkspace(null);
		conversations.setActiveConversation(userId);
	}

	async function handleCreateChannel() {
		if (!$workspace.activeWorkspaceId) return;
		try {
			const name = prompt('Enter channel name:');
			if (!name) return;

			const response = await fetch(`http://localhost:8000/api/conversations`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					name: name.trim(),
					workspace_id: $workspace.activeWorkspaceId,
					conversation_type: 'PUBLIC'
				}),
				credentials: 'include'
			});

			if (!response.ok) throw new Error('Failed to create channel');
			const newChannel = await response.json();

			// Refresh the channels list
			await workspace.setActiveWorkspace($workspace.activeWorkspaceId);
			workspace.setActiveChannel(newChannel.id);
		} catch (error) {
			console.error('Error creating channel:', error);
		}
	}

	function determineAvatar(conversation: (typeof $conversations.conversations)[number]) {
		if (conversation.participant_1?.id == $auth.user?.id) {
			if (conversation.participant_2?.avatar_url) {
				return conversation.participant_2.avatar_url;
			} else {
				if (conversation.participant_2?.display_name) {
					return conversation.participant_2.display_name[0].toUpperCase();
				} else {
					return conversation.participant_2?.username[0].toUpperCase() || 'U';
				}
			}
		} else {
			if (conversation.participant_1?.avatar_url) {
				return conversation.participant_1.avatar_url;
			} else {
				if (conversation.participant_1?.display_name) {
					return conversation.participant_1.display_name[0].toUpperCase();
				} else {
					return conversation.participant_1?.username[0].toUpperCase() || 'U';
				}
			}
		}
	}
</script>

<div class="flex h-screen">
	<Sidebar.Provider
		onOpenChange={(open) => {
			isCollapsed = !open;
			dispatch('collapseChange', { isCollapsed });
		}}
	>
		<Sidebar.Root
			class="w-[250px] transition-all duration-200"
			collapsible={'icon' as const}
			variant="sidebar"
			side="left"
		>
			<Sidebar.Header>
				<div class="relative flex items-center {isCollapsed ? 'justify-center' : 'justify-end'}">
					<div class="flex-shrink-0">
						<Sidebar.Trigger>
							<Button.Root variant="ghost" size="icon">
								{#if isCollapsed}
									<CaretRight size={16} />
								{:else}
									<CaretLeft size={16} />
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
											<img
												src={workspaceItem.icon_url}
												alt={workspaceItem.name}
												class="h-4 w-4 rounded"
											/>
										{:else}
											<House class="h-4 w-4" />
										{/if}
										<span>{workspaceItem.name}</span>
									</Sidebar.MenuButton>
								</Sidebar.MenuItem>
							{/each}
							<Sidebar.MenuItem>
								<Sidebar.MenuButton onclick={() => (isWorkspaceDialogOpen = true)}>
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
											handleSelectDm(conversation.participant_2!.id);
											conversations.setActiveConversation(conversation.participant_2!.id);
										}}
										isActive={$conversations.activeConversationId === conversation.id}
									>
										<Avatar.Root class="flex h-4 w-4 items-center justify-center">
											<Avatar.Image
												src={conversation.participant_2?.avatar_url}
												alt={conversation.participant_2?.display_name ||
													conversation.participant_2?.username}
											/>
											<Avatar.Fallback
												class="flex h-full w-full items-center justify-center text-[10px] font-medium"
											>
												{determineAvatar(conversation)}
											</Avatar.Fallback>
										</Avatar.Root>
										<span
											>{conversation.participant_2?.display_name ||
												conversation.participant_2?.username}</span
										>
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

	<WorkspaceCreateDialog
		bind:open={isWorkspaceDialogOpen}
		on:workspaceCreated={handleWorkspaceCreated}
	/>
</div>
