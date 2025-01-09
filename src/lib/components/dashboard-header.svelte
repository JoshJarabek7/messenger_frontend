<script lang="ts">
	import * as Avatar from '$lib/components/ui/avatar';
	import * as Button from '$lib/components/ui/button';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { MagnifyingGlass, User as UserIcon } from 'phosphor-svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import { goto } from '$app/navigation';
	import type { User } from '$lib/types';
	import UserSettingsDialog from './user-settings-dialog.svelte';
	import SearchDialog from './search-dialog.svelte';

	let { user } = $props<{
		user: User | null;
	}>();

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

	console.log('user:', user?.display_name);
</script>

<div class="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
	<div class="flex h-14 items-center gap-4 px-4">
		<Button.Root variant="ghost" size="icon" onclick={() => (isSearchDialogOpen = true)}>
			<MagnifyingGlass class="h-5 w-5" />
		</Button.Root>

		<SearchDialog
			open={isSearchDialogOpen}
			onOpenChange={(value: boolean) => (isSearchDialogOpen = value)}
			currentUserId={user?.id ?? ''}
		/>

		<div class="ml-auto">
			{#if user}
				<DropdownMenu.Root>
					<DropdownMenu.Trigger>
						<Button.Root variant="ghost" class="h-8 w-8 rounded-full">
							<Avatar.Root class="h-8 w-8">
								<Avatar.Image src={user.avatar_url} alt={user.display_name ?? user.username} />
								<Avatar.Fallback>
									<UserIcon class="h-4 w-4" />
								</Avatar.Fallback>
							</Avatar.Root>
						</Button.Root>
					</DropdownMenu.Trigger>
					<DropdownMenu.Content>
						<div class="flex items-center justify-start gap-2 p-2">
							<div class="flex flex-col space-y-1">
								<p class="text-sm font-medium leading-none">{user.display_name ?? user.username}</p>
								<p class="text-xs leading-none text-muted-foreground">{user.email}</p>
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
