<script lang="ts">
	import { cn } from '$lib/utils';
	import { users } from '$lib/stores/users.svelte';

	let { userId, className = '' } = $props<{
		userId: string;
		className?: string;
	}>();

	$effect(() => {
		if (userId) {
			users.getUser(userId);
		}
	});
</script>

<div
	class={cn(
		'absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background',
		users.isUserOnline(userId) ? 'bg-green-500' : 'bg-red-500',
		className
	)}
/>
