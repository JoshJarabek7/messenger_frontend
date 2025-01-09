<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { auth } from '$lib/stores/auth.svelte';
	import { workspace } from '$lib/stores/workspace.svelte';
	import { websocket } from '$lib/stores/websocket.svelte';
	import DashboardHeader from '$lib/components/dashboard-header.svelte';
	import UserSearch from '$lib/components/user-search.svelte';
	import AppSidebar from '$lib/components/app-sidebar.svelte';
	import Chat from '$lib/components/chat.svelte';
	import { conversations } from '$lib/stores/conversations.svelte.js';
	import { workspaces } from '$lib/stores/workspaces.svelte';
	import type { Workspace } from '$lib/types';

	let { data } = $props();

	let isUserSearchOpen = $state(false);
	let isSidebarCollapsed = $state(false);
	let refreshInterval: ReturnType<typeof setInterval>;

	async function refreshToken() {
		try {
			const response = await fetch('http://localhost:8000/api/auth/refresh', {
				method: 'POST',
				credentials: 'include'
			});

			if (!response.ok) {
				console.error('Failed to refresh token');
				// If refresh fails, redirect to login
				await auth.logout();
				goto('/');
			}
		} catch (error) {
			console.error('Error refreshing token:', error);
			await auth.logout();
			goto('/');
		}
	}

	onMount(async () => {
		try {
			// Initialize workspaces store with data from the server
			await workspaces.loadWorkspaces();
			await conversations.loadConversations();

			// Update auth store with user data
			auth.updateUser(data.user);

			// Set up token refresh interval (every 60 seconds)
			refreshInterval = setInterval(refreshToken, 60 * 1000);

			// Initial token refresh
			await refreshToken();
		} catch (error) {
			console.error('Error initializing dashboard:', error);
		}
	});

	onDestroy(() => {
		if (refreshInterval) {
			clearInterval(refreshInterval);
		}
	});

	function handleOpenChange(value: boolean) {
		isUserSearchOpen = value;
	}

	function handleOpenUserSearch() {
		handleOpenChange(true);
	}

	function handleSidebarCollapseChange(event: CustomEvent<{ isCollapsed: boolean }>) {
		isSidebarCollapsed = event.detail.isCollapsed;
	}

	// Initialize websocket when auth is ready
	$effect(() => {
		const user = $auth.user;
		if (!user) return;

		try {
			websocket.connect();
		} catch (error) {
			console.error('Error initializing websocket:', error);
		}
	});
</script>

<div class="flex h-screen">
	<AppSidebar
		workspaces={$workspaces.workspaces}
		recentDms={data.recentDms}
		onOpenUserSearch={handleOpenUserSearch}
		on:collapseChange={handleSidebarCollapseChange}
	/>
	<div class="flex min-w-0 flex-1 flex-col">
		<DashboardHeader user={$auth.user} />
		<!-- Main Content -->
		<main class="flex-1 bg-background">
			{#if $workspace.activeChannelId}
				<Chat chatId={$workspace.activeChannelId} chatType="PUBLIC" />
			{:else if $conversations.activeConversationId}
				<Chat chatId={$conversations.activeConversationId} chatType="DIRECT" />
			{:else}
				<div class="flex h-full items-center justify-center text-muted-foreground">
					Select a channel or start a conversation to begin chatting
				</div>
			{/if}
		</main>
	</div>
</div>

<!-- User Search Dialog -->
<UserSearch
	open={isUserSearchOpen}
	onOpenChange={handleOpenChange}
	currentUserId={$auth.user?.id ?? ''}
/>

<style>
	:global(body) {
		overflow: hidden;
	}
</style>
