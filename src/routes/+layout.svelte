<script lang="ts">
	import '../app.css';
	import { ModeWatcher } from 'mode-watcher';
	import { Toaster } from '$lib/components/ui/sonner/index.js';
	import { setupWebSocketHandlers } from '$lib/handlers/websocket.svelte';
	import { onMount } from 'svelte';

	let { children } = $props();

	onMount(() => {
		setupWebSocketHandlers();
	});
</script>

<ModeWatcher />
<Toaster />

{@render children()}
