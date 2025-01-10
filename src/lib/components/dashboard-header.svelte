<script lang="ts">
	import * as Avatar from '$lib/components/ui/avatar';
	import * as Button from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { MagnifyingGlass, User as UserIcon } from 'phosphor-svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { workspace } from '$lib/stores/workspace.svelte';
	import { goto } from '$app/navigation';
	import type { User } from '$lib/types';
	import UserSettingsDialog from './user-settings-dialog.svelte';
	import SearchDialog from './search-dialog.svelte';
	import UserPresence from './user-presence.svelte';

	let isSettingsOpen = $state(false);
	let isSearchDialogOpen = $state(false);

	async function handleLogout() {
		try {
			await auth.logout();
			goto('/');
		} catch (error) {
			console.error('Error logging out:', error);
		}
	}

	function handleOpenSettings() {
		isSettingsOpen = true;
	}

	// Get current channel info
	$effect(() => {
		const activeChannel = $workspace.activeChannel;
		if (activeChannel) {
			console.log('Active channel:', activeChannel);
		}
	});
</script>

<div class="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
	<div class="flex h-20 items-center gap-4 px-4">
		<Button.Root variant="ghost" size="icon" onclick={() => (isSearchDialogOpen = true)}>
			<MagnifyingGlass class="h-12 w-12" />
		</Button.Root>

		{#if $workspace.activeChannel}
			<div class="flex flex-col">
				<h2 class="text-sm font-semibold">{$workspace.activeChannel.name}</h2>
				{#if $workspace.activeChannel.description}
					<p class="text-xs text-muted-foreground">{$workspace.activeChannel.description}</p>
				{/if}
			</div>
		{/if}

		<SearchDialog
			open={isSearchDialogOpen}
			onOpenChange={(value: boolean) => (isSearchDialogOpen = value)}
			currentUserId={$auth.user?.id ?? ''}
		/>

		<div class="ml-auto">
			{#if $auth.user}
				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						<Button.Root variant="ghost" class="relative h-12 w-12 rounded-full">
							<Avatar.Root class="h-12 w-12">
								<Avatar.Image
									src={$auth.user.avatar_url}
									alt={$auth.user.display_name ?? $auth.user.username}
								/>
								<Avatar.Fallback>
									<UserIcon class="h-12 w-12" />
								</Avatar.Fallback>
							</Avatar.Root>
							<UserPresence userId={$auth.user.id} className="h-4 w-4 border-2" />
						</Button.Root>
					</DropdownMenu.Trigger>
					<DropdownMenu.Content>
						<div class="flex items-center justify-start gap-2 p-2">
							<div class="flex flex-col space-y-1">
								<p class="text-lg font-medium leading-none">
									{$auth.user.display_name ?? $auth.user.username}
								</p>
								<p class="text-sm leading-none text-muted-foreground">{$auth.user.email}</p>
							</div>
						</div>
						<DropdownMenu.Item onSelect={handleOpenSettings}>Settings</DropdownMenu.Item>
						<DropdownMenu.Item onSelect={handleLogout}>Log out</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			{/if}
		</div>
	</div>
</div>

<UserSettingsDialog
	open={isSettingsOpen}
	onOpenChange={(value: boolean) => (isSettingsOpen = value)}
/>
