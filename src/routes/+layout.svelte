<script lang="ts">
	import '../app.css';
	import { ModeWatcher } from "mode-watcher";
	import { auth } from "$lib/stores/auth.svelte";
	let { children } = $props();
</script>

<ModeWatcher />

{#if $auth.isLoading}
	<div class="flex items-center justify-center min-h-screen">
		<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
	</div>
{:else}
	{@render children()}
{/if}
