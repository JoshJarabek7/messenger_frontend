<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Input } from '$lib/components/ui/input';
	import { Search, Shell } from 'lucide-svelte';
	import { workspace_api } from '$lib/api/workspace.svelte';
	import { ui_store } from '$lib/stores/ui.svelte';
	import { search_api, type SearchType } from '$lib/api/search.svelte';
	import { user_store } from '$lib/stores/user.svelte';
	import { workspace_store } from '$lib/stores/workspace.svelte';
	import { conversation_store } from '$lib/stores/conversation.svelte';
	import UserAvatar from './user-avatar.svelte';
	import type { IUser } from '$lib/types/user.svelte';
	import type { IWorkspace } from '$lib/types/workspaces.svelte';
	import { file_store } from '$lib/stores/file.svelte';
	import { conversation_api } from '$lib/api/conversation.svelte';
	import { toast } from 'svelte-sonner';
	import { buildWorkspace, buildConversation } from '$lib/helpers.svelte';

	let searchQuery = $state('');
	let searchResults = $state<{ workspaces?: IWorkspace[]; users?: IUser[] }>({});
	let isLoading = $state(false);
	let error = $state<string | null>(null);
	let joiningWorkspace = $state<string | null>(null);
	let joinError = $state<string | null>(null);
	let searchTimeout: number | null = null;

	async function handleSearch() {
		if (searchTimeout) {
			clearTimeout(searchTimeout);
		}

		if (!searchQuery.trim()) {
			searchResults = {};
			return;
		}

		isLoading = true;
		error = null;

		searchTimeout = setTimeout(async () => {
			try {
				const type = ui_store.getUserSearchTab().toUpperCase() as SearchType;
				const results = await search_api.search(searchQuery, type);
				if (type === 'WORKSPACES') {
					searchResults = { workspaces: results as IWorkspace[] };
				} else {
					searchResults = { users: results as IUser[] };
				}
			} catch (e) {
				console.error('Search failed:', e);
				error = e instanceof Error ? e.message : 'Search failed';
				searchResults = {};
			} finally {
				isLoading = false;
			}
		}, 300) as unknown as number;
	}

	// Clear search when tab changes
	$effect(() => {
		const tab = ui_store.getUserSearchTab();
		searchQuery = '';
		searchResults = {};
	});

	async function handleWorkspaceSelect(workspaceId: string) {
		try {
			joiningWorkspace = workspaceId;
			joinError = null;

			// Join the workspace
			const workspace = await workspace_api.joinWorkspace(workspaceId);

			// If we get here, we successfully joined
			toast.success('Successfully joined workspace');

			// Build the workspace data
			await buildWorkspace(workspaceId);

			// Make sure the workspace exists in the store before switching to it
			const builtWorkspace = workspace_store.getWorkspace(workspaceId);
			if (!builtWorkspace) {
				throw new Error('Failed to build workspace data');
			}

			// Update UI
			ui_store.selectWorkspace(workspaceId);
			ui_store.toggleGlobalSearch();
		} catch (error) {
			console.error('Error joining workspace:', error);
			joinError = error instanceof Error ? error.message : 'Failed to join workspace';
			toast.error(joinError);
		} finally {
			joiningWorkspace = null;
		}
	}

	async function handleUserSelect(user: IUser) {
		if (user.id === user_store.getMe()?.id) return;

		try {
			// Create the conversation on the backend
			const conversation = await conversation_api.createDirectMessageConversation({
				conversation_type: 'direct',
				user_id: user.id,
				content: '' // Empty initial message
			});

			// Clear active workspace and channel
			ui_store.unselectWorkspace();
			ui_store.unselectChannel();

			// Add conversation to store first
			conversation_store.setConversation({
				...conversation,
				messages: [],
				users_typing: [] // Initialize as empty array instead of Set
			});

			// Then build it to ensure all dependencies are loaded
			await buildConversation(conversation.id);

			// Select the conversation
			ui_store.selectDirectMessageConversation(conversation.id);

			// Clear search and close dialog
			searchQuery = '';
			searchResults = {};
			ui_store.toggleGlobalSearch();
		} catch (error) {
			console.error('Failed to create conversation:', error);
			toast.error(error instanceof Error ? error.message : 'Failed to create conversation');
		}
	}
</script>

<Dialog.Root open={ui_store.globalSearchOpen()} onOpenChange={() => ui_store.toggleGlobalSearch()}>
	<Dialog.Content class="sm:max-w-[600px]">
		<Dialog.Header>
			<Dialog.Title>Search</Dialog.Title>
			<Dialog.Description>Search for workspaces and users</Dialog.Description>
		</Dialog.Header>

		<div class="flex items-center space-x-2 py-4">
			<div class="relative flex-1">
				<Search class="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
				<Input
					class="pl-9"
					placeholder="Search..."
					bind:value={searchQuery}
					oninput={handleSearch}
				/>
			</div>
		</div>

		{#if joinError}
			<div class="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
				{joinError}
			</div>
		{/if}

		{#if error}
			<div class="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
				{error}
			</div>
		{/if}

		<Tabs.Root
			value={ui_store.getUserSearchTab()}
			onValueChange={(value) => ui_store.setUserSearchTab(value as 'users' | 'workspaces')}
			class="mt-2"
		>
			<Tabs.List>
				<Tabs.Trigger value="workspaces">Workspaces</Tabs.Trigger>
				<Tabs.Trigger value="users">Users</Tabs.Trigger>
			</Tabs.List>

			{#if isLoading}
				<div class="p-4 text-center text-sm text-muted-foreground">
					<div
						class="mx-auto h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"
					></div>
					<p class="mt-2">Searching...</p>
				</div>
			{:else if searchQuery}
				<Tabs.Content value="workspaces" class="mt-4">
					{#if !searchResults.workspaces?.length}
						<p class="py-4 text-center text-sm text-muted-foreground">No workspaces found</p>
					{:else}
						<div class="space-y-2">
							{#each searchResults.workspaces as workspace}
								<button
									class="flex w-full items-center gap-2 rounded-md p-3 text-left transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50"
									onclick={() => handleWorkspaceSelect(workspace.id)}
									disabled={(() => {
										const existingWorkspace = workspace_store.getWorkspace(workspace.id);
										if (!existingWorkspace) return false;
										return (
											existingWorkspace.admins.has(user_store.getMe().id) ||
											existingWorkspace.members.has(user_store.getMe().id) ||
											existingWorkspace.created_by_id === user_store.getMe().id ||
											joiningWorkspace === workspace.id
										);
									})()}
								>
									{#if workspace.s3_key}
										<img
											src={URL.createObjectURL(file_store.getFile(workspace.s3_key)!.file_blob!)}
											alt={workspace.name}
											class="h-8 w-8 rounded"
										/>
									{:else}
										<div class="flex h-8 w-8 items-center justify-center rounded bg-primary/10">
											{workspace.name[0].toUpperCase()}
										</div>
									{/if}
									<div class="flex flex-1 flex-col">
										<span>{workspace.name}</span>
										{#if (() => {
											const existingWorkspace = workspace_store.getWorkspace(workspace.id);
											if (!existingWorkspace) return false;
											return existingWorkspace.admins.has(user_store.getMe().id) || existingWorkspace.members.has(user_store.getMe().id) || existingWorkspace.created_by_id === user_store.getMe().id;
										})()}
											<span class="text-xs text-muted-foreground">Already a member</span>
										{:else if joiningWorkspace === workspace.id}
											<span class="flex items-center gap-1 text-xs text-muted-foreground">
												<Shell class="h-3 w-3 animate-spin" />
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
					{#if !searchResults.users?.length}
						<p class="py-4 text-center text-sm text-muted-foreground">No users found</p>
					{:else}
						<div class="space-y-2">
							{#each searchResults.users as user}
								<button
									class="flex w-full items-center gap-2 rounded-md p-3 text-left transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50"
									onclick={() => handleUserSelect(user)}
									disabled={user.id === user_store.getMe().id}
								>
									<UserAvatar user_id={user.id} />
									<div class="flex min-w-0 flex-col">
										<span class="truncate">{user.display_name || user.username}</span>
										<div class="flex items-center gap-2 text-xs text-muted-foreground">
											<span class="truncate">@{user.username}</span>
											{#if user.email}
												<span class="shrink-0">•</span>
												<span class="truncate">{user.email}</span>
											{/if}
											{#if user.id === user_store.getMe().id}
												<span class="shrink-0">•</span>
												<span class="truncate text-muted-foreground">This is you</span>
											{/if}
										</div>
									</div>
								</button>
							{/each}
						</div>
					{/if}
				</Tabs.Content>
			{/if}
		</Tabs.Root>
	</Dialog.Content>
</Dialog.Root>
