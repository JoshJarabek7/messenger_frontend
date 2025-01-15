<script lang="ts">
	import { file_store } from '$lib/stores/file.svelte';
	import { user_store } from '$lib/stores/user.svelte';
	import UserPresence from '$lib/components/user-presence.svelte';

	let { user_id } = $props<{ user_id: string }>();
</script>

<div class="relative">
	{#if user_store.getUser(user_id) && user_store.getUser(user_id)?.s3_key}
		<img
			src={URL.createObjectURL(
				file_store.getFile(user_store.getUser(user_id)?.s3_key ?? '')?.file_blob ?? new Blob()
			)}
			alt={user_store.getUser(user_id)?.display_name ||
				user_store.getUser(user_id)?.username ||
				'User'}
			class="h-10 w-10 rounded-full"
		/>
	{:else if user_store.getUser(user_id)}
		<div class="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
			<span class="text-sm font-medium uppercase">
				{(user_store.getUser(user_id)?.display_name ||
					user_store.getUser(user_id)?.username ||
					'?')[0]}
			</span>
		</div>
	{/if}
	<UserPresence userId={user_id} />
</div>
