<script lang="ts">
	import * as Button from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { Search } from 'lucide-svelte';

	import { goto } from '$app/navigation';
	import UserSettingsDialog from './user-settings-dialog.svelte';
	import SearchDialog from './search-dialog.svelte';
	import UserAvatar from './user-avatar.svelte';
	import { auth_api } from '$lib/api/auth.svelte';
	import { ui_store } from '$lib/stores/ui.svelte';
	import { channel_store } from '$lib/stores/channel.svelte';
	import { user_store } from '$lib/stores/user.svelte';
	import type { IUser } from '$lib/types/user.svelte';

	async function handleLogout() {
		try {
			await auth_api.logout();
			goto('/');
		} catch (error) {
			console.error('Error logging out:', error);
		}
	}

	let me = $derived(() => {
		return user_store.getUser(user_store.getMe()?.id);
	});
</script>

<div class="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
	<div class="flex h-20 items-center gap-4 px-4">
		<Button.Root variant="ghost" size="icon" onclick={() => ui_store.toggleGlobalSearch()}>
			<Search class="h-12 w-12" />
		</Button.Root>

		{#if ui_store.channelSelected()}
			<div class="flex flex-col">
				<h2 class="text-sm font-semibold">
					{channel_store.getChannel(ui_store.channelSelected()!)?.name ?? ''}
				</h2>
				{#if channel_store.getChannel(ui_store.channelSelected()!)?.description}
					<p class="text-xs text-muted-foreground">
						{channel_store.getChannel(ui_store.channelSelected()!)?.description ?? ''}
					</p>
				{/if}
			</div>
		{/if}

		<SearchDialog />

		<div class="ml-auto">
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					<Button.Root variant="ghost" class="relative h-12 w-12 rounded-full">
						<UserAvatar user_id={me()?.id ?? ''} />
					</Button.Root>
				</DropdownMenu.Trigger>
				<DropdownMenu.Content>
					<div class="flex items-center justify-start gap-2 p-2">
						<div class="flex flex-col space-y-1">
							<p class="text-lg font-medium leading-none">
								{me()?.display_name ?? me()?.username}
							</p>
							<p class="text-sm leading-none text-muted-foreground">{me()?.email}</p>
						</div>
					</div>
					<DropdownMenu.Item onSelect={() => ui_store.toggleUserSettings()}>
						Settings
					</DropdownMenu.Item>
					<DropdownMenu.Item onSelect={handleLogout}>Log out</DropdownMenu.Item>
				</DropdownMenu.Content>
			</DropdownMenu.Root>
		</div>
	</div>
</div>

<UserSettingsDialog />
