<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { auth } from '$lib/stores/auth.svelte';
	import { workspace } from '$lib/stores/workspace.svelte';
	import { websocket } from '$lib/stores/websocket.svelte';
	import { users } from '$lib/stores/users.svelte';
	import DashboardHeader from '$lib/components/dashboard-header.svelte';
	import UserSearch from '$lib/components/user-search.svelte';
	import AppSidebar from '$lib/components/app-sidebar.svelte';
	import { conversations } from '$lib/stores/conversations.svelte.js';
	import { workspaces } from '$lib/stores/workspaces.svelte';
	import { messages } from '$lib/stores/messages.svelte';
	import { presence } from '$lib/stores/presence.svelte';
	import type { Workspace, Channel, Conversation } from '$lib/types';
	import { toast } from 'svelte-sonner';
	import { setupWebSocketHandlers } from '$lib/stores/websocket-handlers';

	let { data, children } = $props();

	let isUserSearchOpen = $state(false);
	let isSidebarCollapsed = $state(false);
	let refreshInterval: ReturnType<typeof setInterval>;
	let isInitialDataLoaded = $state(false);

	async function refreshToken() {
		try {
			const response = await fetch('http://localhost:8000/api/auth/refresh', {
				method: 'POST',
				credentials: 'include'
			});

			if (!response.ok) {
				console.error('Failed to refresh token');
				await auth.logout();
				goto('/');
			}
		} catch (error) {
			console.error('Error refreshing token:', error);
			await auth.logout();
			goto('/');
		}
	}

	// Load workspace data including channels, members, and files
	async function loadWorkspaceData(workspaceId: string) {
		try {
			const [channelsResponse, membersResponse, filesResponse] = await Promise.all([
				fetch(`http://localhost:8000/api/workspaces/${workspaceId}/channels`, {
					credentials: 'include'
				}),
				fetch(`http://localhost:8000/api/workspaces/${workspaceId}/members`, {
					credentials: 'include'
				}),
				fetch(`http://localhost:8000/api/workspaces/${workspaceId}/files`, {
					credentials: 'include'
				})
			]);

			if (!channelsResponse.ok || !membersResponse.ok || !filesResponse.ok) {
				throw new Error('Failed to fetch workspace data');
			}

			const [channels, members, files] = await Promise.all([
				channelsResponse.json(),
				membersResponse.json(),
				filesResponse.json()
			]);

			// Update workspace store with the data
			workspace.setMembers(workspaceId, members);
			workspace.setFiles(workspaceId, files);
			workspace.setChannels(workspaceId, channels);

			// Load messages for each channel
			await Promise.all(
				channels.map(async (channel: Channel) => {
					const messagesResponse = await fetch(
						`http://localhost:8000/api/messages/${channel.id}?limit=50`,
						{
							credentials: 'include'
						}
					);
					if (messagesResponse.ok) {
						const channelMessages = await messagesResponse.json();
						messages.setMessagesForConversation(channel.id, channelMessages);
					}
				})
			);
		} catch (error) {
			console.error('Error loading workspace data:', error);
			toast.error('Failed to load workspace data');
		}
	}

	// Load all initial data
	async function loadInitialData() {
		isInitialDataLoaded = false;

		try {
			// Load workspaces
			await workspaces.loadWorkspaces();

			// Get the current workspaces list
			let workspaceList: Workspace[] = [];
			workspaces.subscribe((state) => {
				workspaceList = state.workspaces;
			})();

			// Load data for each workspace in parallel
			await Promise.all(workspaceList.map((w: Workspace) => loadWorkspaceData(w.id)));

			// Load recent conversations
			await conversations.loadConversations();

			// Load messages for each conversation
			let recentConversations: Conversation[] = [];
			conversations.subscribe((state) => {
				recentConversations = state.conversations;
			})();

			await Promise.all(
				recentConversations.map(async (conv: Conversation) => {
					const messagesResponse = await fetch(
						`http://localhost:8000/api/messages/${conv.id}?limit=50`,
						{
							credentials: 'include'
						}
					);
					if (messagesResponse.ok) {
						const convMessages = await messagesResponse.json();
						messages.setMessagesForConversation(conv.id, convMessages);
					}
				})
			);
		} catch (error) {
			console.error('Error loading initial data:', error);
			toast.error('Failed to load initial data');
		} finally {
			isInitialDataLoaded = true;
		}
	}

	onMount(async () => {
		// Set up WebSocket event handlers first
		setupWebSocketHandlers();

		// Load initial data
		await loadInitialData();

		// Set up token refresh interval (every 60 seconds)
		refreshInterval = setInterval(refreshToken, 60 * 1000);

		// Initial token refresh
		await refreshToken();

		// Connect WebSocket after everything is set up
		websocket.connect();
	});

	onDestroy(() => {
		if (refreshInterval) {
			clearInterval(refreshInterval);
		}
		// Disconnect WebSocket
		websocket.disconnect();
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
</script>

<div class="flex h-screen">
	{#if isInitialDataLoaded}
		<AppSidebar
			workspaces={$workspaces.workspaces}
			recentDms={data.recentDms}
			onOpenUserSearch={handleOpenUserSearch}
			on:collapseChange={handleSidebarCollapseChange}
		/>
		<div class="flex min-w-0 flex-1 flex-col">
			<DashboardHeader user={$auth.user} />
			<!-- Main Content -->
			{@render children()}
		</div>
	{:else}
		<div class="flex h-full w-full items-center justify-center">
			<div
				class="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
			></div>
		</div>
	{/if}
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
