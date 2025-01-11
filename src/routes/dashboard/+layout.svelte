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
	import type { Workspace, Channel, Conversation } from '$lib/types';
	import { toast } from 'svelte-sonner';
	import { setupWebSocketHandlers } from '$lib/stores/websocket-handlers';
	import { API_BASE_URL } from '$lib/config.ts';
	let { data, children } = $props();

	let isUserSearchOpen = $state(false);
	let isSidebarCollapsed = $state(false);
	let refreshInterval: ReturnType<typeof setInterval>;
	let isInitialDataLoaded = $state(false);
	let isLoadingWorkspaceData = $state(false);
	let lastLoadAttempt = $state<Record<string, number>>({});

	async function refreshToken() {
		try {
			const response = await fetch('${API_BASE_URL}/auth/refresh', {
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
		if (!workspaceId || isLoadingWorkspaceData) return;

		// Update last attempt time
		lastLoadAttempt[workspaceId] = Date.now();
		isLoadingWorkspaceData = true;
		workspace.setLoading(true);

		try {
			const [channelsResponse, membersResponse, filesResponse] = await Promise.all([
				fetch(`${API_BASE_URL}/workspaces/${workspaceId}/channels`, {
					credentials: 'include'
				}),
				fetch(`${API_BASE_URL}/workspaces/${workspaceId}/members`, {
					credentials: 'include'
				}),
				fetch(`${API_BASE_URL}/workspaces/${workspaceId}/files`, {
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
						`${API_BASE_URL}/messages/${channel.id}?limit=50`,
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

			return channels;
		} catch (error) {
			console.error('Error loading workspace data:', error);
			toast.error('Failed to load workspace data');
			throw error;
		} finally {
			workspace.setLoading(false);
			isLoadingWorkspaceData = false;
		}
	}

	// Load all initial data
	async function loadInitialData() {
		isInitialDataLoaded = false;

		try {
			// Load user data first
			await auth.loadUser();

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
						`${API_BASE_URL}/messages/${conv.id}?limit=50`,
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

	// Track workspace state changes
	$effect(() => {
		const activeWorkspace = $workspace.activeWorkspace;
		const channels = $workspace.channels;
		const isLoading = $workspace.isLoading;
		const workspaceCache = activeWorkspace ? workspace.getWorkspaceData(activeWorkspace.id) : null;
		const now = Date.now();
		const lastAttemptTime = activeWorkspace ? lastLoadAttempt[activeWorkspace.id] || 0 : 0;
		const timeSinceLastAttempt = now - lastAttemptTime;

		console.log('Workspace effect state:', {
			workspaceId: activeWorkspace?.id,
			channels: channels.length,
			isLoading,
			isLoadingWorkspaceData,
			hasCache: !!workspaceCache,
			cacheChannels: workspaceCache?.channels?.length,
			timeSinceLastAttempt
		});

		// Only reload if:
		// 1. We have an active workspace
		// 2. Initial data is loaded
		// 3. We're not currently loading
		// 4. We haven't tried loading in the last 5 seconds
		// 5. We don't have any channels (either in state or cache)
		if (
			activeWorkspace &&
			isInitialDataLoaded &&
			!isLoading &&
			!isLoadingWorkspaceData &&
			timeSinceLastAttempt > 5000 &&
			channels.length === 0 &&
			(!workspaceCache?.channels || workspaceCache.channels.length === 0)
		) {
			console.log('Loading workspace data for:', activeWorkspace.id);
			loadWorkspaceData(activeWorkspace.id).catch(() => {
				// Error already handled in loadWorkspaceData
			});
		}
	});

	// Track workspace channel changes for debugging
	$effect(() => {
		const channels = $workspace.channels;
		const activeChannel = $workspace.activeChannel;
		const activeWorkspace = $workspace.activeWorkspace;
		console.log('Workspace state updated:', {
			workspaceId: activeWorkspace?.id,
			channels: channels.map((c) => c.id),
			activeChannel: activeChannel?.id,
			channelCount: channels.length,
			isLoading: $workspace.isLoading,
			isLoadingWorkspaceData
		});
	});

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
