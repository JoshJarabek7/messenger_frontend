<script lang="ts">
	import { user_store } from '$lib/stores/user.svelte';

	let { userId } = $props<{
		userId: string;
	}>();
</script>

<div
	class={'absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background ' +
		(user_store.getUser(userId)?.online ? 'bg-green-500' : 'bg-red-500')}
></div>
