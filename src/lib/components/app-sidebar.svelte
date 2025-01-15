<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar';
	import { Plus, House, ChevronLeft, ChevronRight, Hash } from 'lucide-svelte';
	import { workspace_store } from '$lib/stores/workspace.svelte.ts';
	import * as Button from '$lib/components/ui/button';
	import WorkspaceCreateDialog from './workspace-create-dialog.svelte';
	import ChannelCreateDialog from './channel-create-dialog.svelte';
	import { conversation_store } from '$lib/stores/conversation.svelte';
	import { ui_store } from '$lib/stores/ui.svelte';
	import { file_store } from '$lib/stores/file.svelte';
	import { channel_store } from '$lib/stores/channel.svelte';
	import { user_store } from '$lib/stores/user.svelte';
	import UserAvatar from './user-avatar.svelte';
</script>

<div class="flex h-screen">
	<Sidebar.Provider
		onOpenChange={() => {
			ui_store.toggleSidebar();
		}}
	>
		<Sidebar.Root
			class="w-[250px] transition-all duration-200"
			collapsible={'icon' as const}
			variant="sidebar"
			side="left"
		>
			<Sidebar.Header>
				<div
					class="relative flex items-center {ui_store.getSidebarCollapsed()
						? 'justify-center'
						: 'justify-end'}"
				>
					<div class="flex-shrink-0">
						<Sidebar.Trigger>
							<Button.Root variant="ghost" size="icon">
								{#if ui_store.getSidebarCollapsed()}
									<ChevronRight size={16} />
								{:else}
									<ChevronLeft size={16} />
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
							{#each workspace_store.getWorkspaces() as workspaceItem}
								<Sidebar.MenuItem>
									<Sidebar.MenuButton
										onclick={() => ui_store.selectWorkspace(workspaceItem.id)}
										isActive={ui_store.workspaceSelected() === workspaceItem.id}
									>
										{#if workspaceItem.s3_key}
											<img
												src={URL.createObjectURL(
													file_store.getFile(workspaceItem.s3_key)!.file_blob!
												)}
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
								<Sidebar.MenuButton onclick={() => ui_store.toggleCreateWorkspaceDialog()}>
									<Plus class="h-4 w-4" />
									<span>Create Workspace</span>
								</Sidebar.MenuButton>
							</Sidebar.MenuItem>
						</Sidebar.Menu>
					</Sidebar.GroupContent>
				</Sidebar.Group>

				{#if ui_store.workspaceSelected()}
					<Sidebar.Separator />

					<Sidebar.Group>
						<Sidebar.GroupLabel>Channels</Sidebar.GroupLabel>
						<Sidebar.GroupContent>
							<Sidebar.Menu>
								{#each Array.from(workspace_store.getWorkspace(ui_store.workspaceSelected()!)?.channels || []) as channel_id}
									{#if channel_store.getChannel(channel_id)}
										<Sidebar.MenuItem>
											<Sidebar.MenuButton
												onclick={() => ui_store.selectChannel(channel_id)}
												isActive={ui_store.channelSelected() === channel_id}
											>
												<Hash class="h-4 w-4" />
												<span>{channel_store.getChannel(channel_id)?.name}</span>
											</Sidebar.MenuButton>
										</Sidebar.MenuItem>
									{/if}
								{/each}
								<Sidebar.MenuItem>
									<Sidebar.MenuButton onclick={() => ui_store.toggleCreateChannelDialog()}>
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
							{#each conversation_store.getAllDirectMessages() as conversation}
								{#if conversation.user_id}
									<Sidebar.MenuItem>
										<Sidebar.MenuButton
											onclick={() => ui_store.selectDirectMessageConversation(conversation.id)}
											isActive={ui_store.directMessageConversationSelected() === conversation.id}
										>
											<UserAvatar user_id={conversation.user_id} />
											<span
												>{user_store.getUser(conversation.user_id)?.display_name ||
													user_store.getUser(conversation.user_id)?.username}</span
											>
											{#if conversation.is_temporary}
												<span class="ml-2 text-xs text-muted-foreground">(Draft)</span>
											{/if}
										</Sidebar.MenuButton>
									</Sidebar.MenuItem>
								{/if}
							{/each}
							<Sidebar.MenuItem>
								<Sidebar.MenuButton onclick={() => ui_store.setUserSearchOpen(true)}>
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

	<WorkspaceCreateDialog />

	<ChannelCreateDialog />
</div>
