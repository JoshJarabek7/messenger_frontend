<script lang="ts">
	import { file_store } from '$lib/stores/file.svelte';
	import { user_store } from '$lib/stores/user.svelte';
	import UserPresence from '$lib/components/user-presence.svelte';
	import { buildFile } from '$lib/helpers.svelte';
	import { onMount } from 'svelte';
	import * as Avatar from './ui/avatar';
	import { User } from 'lucide-svelte';

	let { user_id } = $props<{ user_id: string }>();
	let avatarUrl = $state<string | null>(null);
	let isLoading = $state(true);

	async function loadAvatar() {
		const user = user_store.getUser(user_id);
		if (!user?.s3_key) {
			isLoading = false;
			return;
		}

		try {
			await buildFile(user.s3_key);

			// Get the file from store
			const file = file_store.getFile(user.s3_key);

			if (file?.file_blob) {
				// Clean up old URL if it exists
				if (avatarUrl) {
					URL.revokeObjectURL(avatarUrl);
				}
				avatarUrl = URL.createObjectURL(file.file_blob);
			}
		} catch (error) {
			console.error('Error loading avatar:', error);
		} finally {
			isLoading = false;
		}
	}

	// Load avatar on mount and cleanup on destroy
	onMount(() => {
		loadAvatar();
		return () => {
			if (avatarUrl) {
				URL.revokeObjectURL(avatarUrl);
			}
		};
	});
</script>

<div class="relative">
	<Avatar.Root class="h-10 w-10">
		{#if isLoading}
			<Avatar.Fallback class="animate-pulse">
				<span class="text-sm font-medium uppercase opacity-50">...</span>
			</Avatar.Fallback>
		{:else if avatarUrl}
			<Avatar.Image
				src={avatarUrl}
				alt={user_store.getUser(user_id)?.display_name ||
					user_store.getUser(user_id)?.username ||
					'User'}
			/>
			<Avatar.Fallback>
				<User class="h-6 w-6" />
			</Avatar.Fallback>
		{:else if user_store.getUser(user_id)}
			<Avatar.Fallback>
				<span class="text-sm font-medium uppercase">
					{(user_store.getUser(user_id)?.display_name ||
						user_store.getUser(user_id)?.username ||
						'?')[0]}
				</span>
			</Avatar.Fallback>
		{/if}
	</Avatar.Root>
	<UserPresence userId={user_id} />
</div>
