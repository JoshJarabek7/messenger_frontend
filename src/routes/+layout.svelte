<script lang="ts">
	import '../app.css';
	import { ModeWatcher } from 'mode-watcher';
	import { Toaster } from '$lib/components/ui/sonner/index.js';
	import { auth } from '$lib/stores/auth.svelte';
	import { onMount } from 'svelte';

	let { children } = $props();

	// Initialize auth on mount
	onMount(() => {
		auth.loadUser();
	});
</script>

<ModeWatcher />
<Toaster />
{#if $auth.isLoading}
	<div class="flex min-h-screen items-center justify-center">
		<div
			class="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900 dark:border-white"
		></div>
	</div>
{:else}
	{@render children()}
{/if}
