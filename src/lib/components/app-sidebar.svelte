<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar';
	import { Plus, House, CaretLeft, CaretRight, Hash } from 'phosphor-svelte';
	import { workspace } from '$lib/stores/workspace.svelte.ts';
	import * as Button from '$lib/components/ui/button';
	import * as Avatar from '$lib/components/ui/avatar';
	import { createEventDispatcher } from 'svelte';
	import WorkspaceCreateDialog from './workspace-create-dialog.svelte';
	import ChannelCreateDialog from './channel-create-dialog.svelte';
	import { conversations } from '$lib/stores/conversations.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import type { Channel, Conversation, Workspace } from '$lib/types';
	import UserPresence from './user-presence.svelte';

	let { workspaces = [], onOpenUserSearch } = $props<{
		workspaces: Workspace[];
		onOpenUserSearch: () => void;
	}>();

	let isCollapsed = $state(false);
	let isWorkspaceDialogOpen = $state(false);
	let isChannelDialogOpen = $state(false);

	$effect(() => {
		console.log('Conversations store updated:', $conversations);
		console.log(
			'Direct messages:',
			$conversations.conversations.filter((c) => c.conversation_type === 'DIRECT')
		);
	});

	const dispatch = createEventDispatcher();

	function handleWorkspaceCreated(event: CustomEvent<{ workspace: Workspace }>) {
		dispatch('workspaceListChanged');
		isWorkspaceDialogOpen = false;
	}

	async function handleWorkspaceClick(workspaceId: string) {
		await workspace.selectWorkspace(workspaceId);
	}

	function handleSelectChannel(channel: Channel) {
		if ($workspace.activeWorkspace) {
			conversations.clearActiveConversation();
			workspace.setActiveChannel(channel);
		}
	}

	function getOtherParticipant(conversation: Conversation) {
		if (!$auth.user) return null;

		// For DM conversations, check both participants
		if (conversation.conversation_type === 'DIRECT') {
			if (conversation.participant_1?.id === $auth.user.id) {
				return conversation.participant_2;
			} else if (conversation.participant_2?.id === $auth.user.id) {
				return conversation.participant_1;
			}
		}
		return null;
	}

	function determineAvatar(conversation: Conversation) {
		const otherParticipant = getOtherParticipant(conversation);
		if (!otherParticipant) return 'U';

		if (otherParticipant.avatar_url) {
			return otherParticipant.avatar_url;
		}

		if (otherParticipant.display_name) {
			return otherParticipant.display_name[0].toUpperCase();
		}

		return otherParticipant.username[0].toUpperCase();
	}

	function handleSelectDm(conversation: Conversation) {
		const otherParticipant = getOtherParticipant(conversation);
		if (!otherParticipant) return;

		workspace.setActiveWorkspace(null);
		workspace.setActiveChannel(null);
		conversations.setActiveConversation(otherParticipant.id);
	}

	async function handleCreateChannel() {
		if (!$workspace.activeWorkspace) return;
		isChannelDialogOpen = true;
	}

	$effect(() => {
		// Track workspace state changes
		console.log('Workspace state updated:', {
			activeWorkspace: $workspace.activeWorkspace?.id,
			channels: $workspace.channels.map((c) => c.id),
			activeChannel: $workspace.activeChannel?.id,
			channelCount: $workspace.channels.length
		});

		// If active channel was deleted, ensure it's cleared
		if (
			$workspace.activeChannel &&
			!$workspace.channels.find((c) => c.id === $workspace.activeChannel?.id)
		) {
			workspace.setActiveChannel(null);
		}
	});

	$effect(() => {
		console.log('Conversations store updated:', $conversations);
		console.log(
			'Direct messages:',
			$conversations.conversations.filter((c) => c.conversation_type === 'DIRECT')
		);
	});

	// Helper function to check if a workspace is active
	function isWorkspaceActive(workspaceId: string): boolean {
		return $workspace.activeWorkspace?.id === workspaceId;
	}

	// Helper function to check if a channel is active
	function isChannelActive(channelId: string): boolean {
		return $workspace.activeChannel?.id === channelId;
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
										onclick={() => handleWorkspaceClick(workspaceItem.id)}
										isActive={isWorkspaceActive(workspaceItem.id)}
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

				{#if $workspace.activeWorkspace}
					<Sidebar.Separator />

					<Sidebar.Group>
						<Sidebar.GroupLabel>Channels</Sidebar.GroupLabel>
						<Sidebar.GroupContent>
							<Sidebar.Menu>
								{#key $workspace.channels}
									{#each $workspace.channels as channel (channel.id)}
										<Sidebar.MenuItem>
											<Sidebar.MenuButton
												onclick={() => handleSelectChannel(channel)}
												isActive={isChannelActive(channel.id)}
											>
												<Hash class="h-4 w-4" />
												<span>{channel.name}</span>
											</Sidebar.MenuButton>
										</Sidebar.MenuItem>
									{/each}
								{/key}
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
							{#each $conversations.conversations.filter((c) => {
								console.log('Filtering conversation:', c);
								return c.conversation_type === 'DIRECT';
							}) as conversation}
								{@const otherParticipant = getOtherParticipant(conversation)}
								{#if otherParticipant}
									<Sidebar.MenuItem>
										<Sidebar.MenuButton
											onclick={() => handleSelectDm(conversation)}
											isActive={$conversations.activeConversationId === conversation.id}
										>
											<div class="relative">
												{#if otherParticipant.avatar_url}
													<img
														src={otherParticipant.avatar_url}
														alt={otherParticipant.display_name || otherParticipant.username}
														class="h-8 w-8 rounded-full"
													/>
												{:else}
													<div
														class="flex h-8 w-8 items-center justify-center rounded-full bg-muted"
													>
														<span class="text-sm font-medium uppercase">
															{(otherParticipant.display_name ||
																otherParticipant.username ||
																'?')[0]}
														</span>
													</div>
												{/if}
												<UserPresence userId={otherParticipant.id || ''} />
											</div>
											<span>{otherParticipant.display_name || otherParticipant.username}</span>
											{#if conversation.is_temporary}
												<span class="ml-2 text-xs text-muted-foreground">(Draft)</span>
											{/if}
										</Sidebar.MenuButton>
									</Sidebar.MenuItem>
								{/if}
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

	<ChannelCreateDialog bind:open={isChannelDialogOpen} />
</div>
