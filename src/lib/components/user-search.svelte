<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Search } from 'lucide-svelte';

	import type { IUser } from '$lib/types/user.svelte';
	import UserAvatar from './user-avatar.svelte';
	import { search_api } from '$lib/api/search.svelte';
	import { ui_store } from '$lib/stores/ui.svelte';
	import { user_store } from '$lib/stores/user.svelte';

	let searchQuery = $state('');
	let searchResults = $state<IUser[]>([]);
	let isLoading = $state(false);
	let error = $state<string | null>(null);
	let searchTimeout: number | null = null;

	async function handleSearch() {
		if (searchTimeout) {
			clearTimeout(searchTimeout);
		}

		if (!searchQuery.trim()) {
			searchResults = [];
			return;
		}

		isLoading = true;
		error = null;

		searchTimeout = setTimeout(async () => {
			try {
				searchResults = (await search_api.search(searchQuery, 'USERS')) as IUser[];
			} catch (e) {
				console.error('Search failed:', e);
				error = e instanceof Error ? e.message : 'Search failed';
				searchResults = [];
			} finally {
				isLoading = false;
			}
		}, 300) as unknown as number;
	}

	async function handleUserSelect(user: IUser) {
		if (user.id === user_store.getMe()!.id) return;
		// TODO: Implement user selection logic
	}
</script>

<Dialog.Root open={ui_store.getUserSearchOpen()} onOpenChange={ui_store.toggleUserSearch}>
	<Dialog.Content class="sm:max-w-[600px]">
		<Dialog.Header>
			<Dialog.Title>Search Users</Dialog.Title>
			<Dialog.Description>Search for a user to start a conversation</Dialog.Description>
		</Dialog.Header>

		<div class="flex items-center space-x-2 py-4">
			<div class="relative flex-1">
				<Search class="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
				<Input
					class="pl-9"
					placeholder="Search users..."
					bind:value={searchQuery}
					on:input={handleSearch}
				/>
			</div>
		</div>

		{#if error}
			<div class="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
				{error}
			</div>
		{/if}

		<div class="max-h-[400px] overflow-y-auto">
			{#if searchQuery && isLoading}
				<div class="p-4 text-center text-sm text-muted-foreground">
					<div
						class="mx-auto h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"
					></div>
					<p class="mt-2">Searching...</p>
				</div>
			{:else if searchQuery && searchResults.length === 0}
				<p class="py-4 text-center text-sm text-muted-foreground">No users found</p>
			{:else if searchQuery}
				<div class="space-y-2">
					{#each searchResults as user}
						<button
							class="flex w-full items-center gap-2 rounded-md p-3 text-left transition-colors hover:bg-accent hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-50"
							onclick={() => handleUserSelect(user)}
							disabled={user.id === user_store.getMe()!.id}
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
									{#if user.id === user_store.getMe()!.id}
										<span class="shrink-0">•</span>
										<span class="truncate text-muted-foreground">This is you</span>
									{/if}
								</div>
							</div>
						</button>
					{/each}
				</div>
			{/if}
		</div>
	</Dialog.Content>
</Dialog.Root>
