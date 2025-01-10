<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Input } from '$lib/components/ui/input';
	import { MagnifyingGlass, Spinner } from 'phosphor-svelte';
	import { search } from '$lib/stores/search.svelte';
	import * as Avatar from '$lib/components/ui/avatar';
	import { conversations } from '$lib/stores/conversations.svelte';
	import { workspace } from '$lib/stores/workspace.svelte';
	import { workspaces } from '$lib/stores/workspaces.svelte';
	import { WorkspaceAPI } from '$lib/api/workspaces';

	interface SearchWorkspace {
		id: string;
		name: string;
		description?: string;
		icon_url?: string;
		is_member?: boolean;
	}

	interface SearchUser {
		id: string;
		username: string;
		display_name?: string;
		avatar_url?: string;
		email: string;
	}

	let { open, onOpenChange, currentUserId } = $props<{
		open: boolean;
		onOpenChange: (value: boolean) => void;
		currentUserId: string;
	}>();

	let searchQuery = $state('');
	let activeTab = $state('workspaces');
	let joiningWorkspace = $state<string | null>(null);
	let joinError = $state<string | null>(null);

	let debounceTimer: ReturnType<typeof setTimeout>;
	function handleSearch(event: Event) {
		const query = (event.target as HTMLInputElement).value;
		searchQuery = query;

		if (!query) {
			search.clear();
			return;
		}

		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(() => {
			const searchType = activeTab === 'workspaces' ? 'workspaces' : 'users';
			search.search(query, searchType);
		}, 300);
	}

	$effect(() => {
		if (searchQuery) {
			const searchType = activeTab === 'workspaces' ? 'workspaces' : 'users';
			search.search(searchQuery, searchType);
		}
	});

	async function handleWorkspaceSelect(workspaceId: string) {
		try {
			joiningWorkspace = workspaceId;
			joinError = null;

			// Join the workspace
			const data = await WorkspaceAPI.join(workspaceId);

			// Refresh the workspaces list
			await workspaces.loadWorkspaces();

			// Set the active workspace
			await workspace.setActiveWorkspace(data);

			// Clear search results and close dialog
			search.clear();
			searchQuery = '';
			onOpenChange(false);
		} catch (error) {
			console.error('Error joining workspace:', error);
			joinError = error instanceof Error ? error.message : 'Failed to join workspace';
		} finally {
			joiningWorkspace = null;
		}
	}

	function handleUserSelect(user: SearchUser) {
		if (user.id === currentUserId) return;

		// Add temporary conversation and set it as active
		conversations.addTemporaryConversation(user);
		conversations.setActiveConversation(user.id);

		// Clear search and close dialog
		search.clear();
		searchQuery = '';
		onOpenChange(false);
	}
</script>

<Dialog.Root {open} {onOpenChange}>
	<Dialog.Content class="sm:max-w-[600px]">
		<Dialog.Header>
			<Dialog.Title>Search</Dialog.Title>
			<Dialog.Description>Search for workspaces and users</Dialog.Description>
		</Dialog.Header>

		<div class="flex items-center space-x-2 py-4">
			<div class="relative flex-1">
				<MagnifyingGlass class="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
				<Input class="pl-9" placeholder="Search..." value={searchQuery} oninput={handleSearch} />
			</div>
		</div>

		{#if joinError}
			<div class="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
				{joinError}
			</div>
		{/if}

		{#if $search.error}
			<div class="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
				{$search.error}
			</div>
		{/if}

		<Tabs.Root value={activeTab} onValueChange={(value) => (activeTab = value)} class="mt-2">
			<Tabs.List>
				<Tabs.Trigger value="workspaces">Workspaces</Tabs.Trigger>
				<Tabs.Trigger value="users">Users</Tabs.Trigger>
			</Tabs.List>

			{#if $search.isLoading}
				<div class="p-4 text-center text-sm text-muted-foreground">
					<div
						class="mx-auto h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"
					></div>
					<p class="mt-2">Searching...</p>
				</div>
			{:else if searchQuery}
				<Tabs.Content value="workspaces" class="mt-4">
					{#if !$search.results?.workspaces?.length}
						<p class="py-4 text-center text-sm text-muted-foreground">No workspaces found</p>
					{:else}
						<div class="space-y-2">
							{#each $search.results.workspaces as workspace}
								<button
									class="flex w-full items-center gap-2 rounded-md p-3 text-left transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50"
									onclick={() => handleWorkspaceSelect(workspace.id)}
									disabled={workspace.is_member || joiningWorkspace === workspace.id}
								>
									{#if workspace.icon_url}
										<img src={workspace.icon_url} alt={workspace.name} class="h-8 w-8 rounded" />
									{:else}
										<div class="flex h-8 w-8 items-center justify-center rounded bg-primary/10">
											{workspace.name[0].toUpperCase()}
										</div>
									{/if}
									<div class="flex flex-1 flex-col">
										<span>{workspace.name}</span>
										{#if workspace.is_member}
											<span class="text-xs text-muted-foreground">Already a member</span>
										{:else if joiningWorkspace === workspace.id}
											<span class="flex items-center gap-1 text-xs text-muted-foreground">
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
					{#if !$search.results?.users?.length}
						<p class="py-4 text-center text-sm text-muted-foreground">No users found</p>
					{:else}
						<div class="space-y-2">
							{#each $search.results.users as user}
								<button
									class="flex w-full items-center gap-2 rounded-md p-3 text-left transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50"
									onclick={() => handleUserSelect(user)}
									disabled={user.id === currentUserId}
								>
									<Avatar.Root class="h-8 w-8">
										<Avatar.Image src={user.avatar_url} alt={user.display_name || user.username} />
										<Avatar.Fallback>
											{(user.display_name || user.username)[0].toUpperCase()}
										</Avatar.Fallback>
									</Avatar.Root>
									<div class="flex min-w-0 flex-col">
										<span class="truncate">{user.display_name || user.username}</span>
										<div class="flex items-center gap-2 text-xs text-muted-foreground">
											<span class="truncate">@{user.username}</span>
											{#if user.email}
												<span class="shrink-0">•</span>
												<span class="truncate">{user.email}</span>
											{/if}
											{#if user.id === currentUserId}
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
