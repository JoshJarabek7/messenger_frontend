<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import DashboardHeader from '$lib/components/dashboard-header.svelte';
	import UserSearch from '$lib/components/user-search.svelte';
	import AppSidebar from '$lib/components/app-sidebar.svelte';
	import { auth_api } from '$lib/api/auth.svelte';
	import { buildAll } from '$lib/helpers.svelte';
	import { ws } from '$lib/stores/websocket.svelte';
	import { ui_store } from '$lib/stores/ui.svelte.js';

	let { data, children } = $props();
	let refreshInterval: ReturnType<typeof setInterval>;
	let isInitialDataLoaded = $state(false);

	onMount(async () => {
		ui_store.setIsLoading(true);
		try {
			await buildAll();
			isInitialDataLoaded = true;
			// Set up token refresh interval (every 60 seconds)
			ui_store.setIsLoading(false);
			refreshInterval = setInterval(auth_api.refreshToken, 60 * 1000);
		} catch (error) {
			console.error('Failed to initialize dashboard:', error);
		} finally {
			ui_store.setIsLoading(false);
		}
	});

	onDestroy(() => {
		if (refreshInterval) {
			clearInterval(refreshInterval);
		}
		// Disconnect WebSocket
		ws.cleanup();
	});
</script>

<div class="flex h-screen">
	{#if ui_store.getIsLoading()}
		<div class="flex h-full w-full items-center justify-center">
			<div
				class="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
			></div>
		</div>
	{:else if isInitialDataLoaded}
		<AppSidebar on:collapseChange={ui_store.toggleSidebar} />
		<div class="flex min-w-0 flex-1 flex-col">
			<DashboardHeader />
			<!-- Main Content -->
			{@render children()}
		</div>
	{:else}
		<div class="flex h-full w-full items-center justify-center">
			<div class="text-center">
				<p class="text-lg text-muted-foreground">Failed to load dashboard</p>
				<button class="mt-4 text-primary hover:underline" onclick={() => window.location.reload()}>
					Retry
				</button>
			</div>
		</div>
	{/if}
</div>

<!-- User Search Dialog -->
<UserSearch />

<style>
	:global(body) {
		overflow: hidden;
	}
</style>
