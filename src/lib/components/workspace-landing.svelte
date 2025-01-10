<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Button from '$lib/components/ui/button';
	import * as Avatar from '$lib/components/ui/avatar';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as ScrollArea from '$lib/components/ui/scroll-area';
	import { Hash, Users, FileText, Gear, Plus } from 'phosphor-svelte';
	import { workspace } from '$lib/stores/workspace.svelte';
	import { auth } from '$lib/stores/auth.svelte';
	import type { Channel, User, Workspace, FileAttachment, WorkspaceMember } from '$lib/types';
	import { FileAPI } from '$lib/api/files';
	import { toast } from 'svelte-sonner';
	import ChannelCreateDialog from '$lib/components/channel-create-dialog.svelte';
	import WorkspaceSettingsDialog from '$lib/components/workspace-settings-dialog.svelte';
	import LeaveWorkspaceDialog from '$lib/components/leave-workspace-dialog.svelte';

	let activeTab = $state('overview');
	let isChannelDialogOpen = $state(false);
	let isSettingsDialogOpen = $state(false);
	let isLeaveDialogOpen = $state(false);
	let isAdmin = $state(false);

	// Compute isAdmin based on current user and members
	$effect(() => {
		if ($auth.user && $workspace.members) {
			const userId = $auth.user.id;
			const ownerIds = $workspace.members.filter((m) => m.role === 'owner').map((m) => m.id);
			const adminIds = $workspace.members.filter((m) => m.role === 'admin').map((m) => m.id);
			isAdmin = ownerIds.includes(userId) || adminIds.includes(userId);
		} else {
			isAdmin = false;
		}
	});

	function handleChannelClick(channel: Channel) {
		workspace.setActiveChannel(channel);
	}

	function formatFileSize(bytes: number) {
		const units = ['B', 'KB', 'MB', 'GB'];
		let size = bytes;
		let unitIndex = 0;

		while (size >= 1024 && unitIndex < units.length - 1) {
			size /= 1024;
			unitIndex++;
		}

		return `${size.toFixed(1)} ${units[unitIndex]}`;
	}

	function decodeFileName(filename: string) {
		try {
			return decodeURIComponent(filename);
		} catch (error) {
			console.error('Error decoding filename:', error);
			return filename;
		}
	}

	async function handleDownload(file: FileAttachment) {
		try {
			window.open(file.download_url, '_blank');
		} catch (error) {
			console.error('Error initiating download:', error);
		}
	}

	function handleTabChange(value: string) {
		activeTab = value;
	}

	async function handleDelete(file: FileAttachment) {
		try {
			await FileAPI.delete(file.id);
			toast.success('File deleted successfully');
		} catch (error) {
			console.error('Error deleting file:', error);
			toast.error('Failed to delete file');
		}
	}
</script>

<div class="container mx-auto max-w-6xl p-6">
	<div class="mb-8">
		<h1 class="mb-2 text-3xl font-bold">{$workspace.activeWorkspace?.name}</h1>
		{#if $workspace.activeWorkspace?.description}
			<p class="text-muted-foreground">{$workspace.activeWorkspace.description}</p>
		{/if}
		{#if isAdmin}
			<Button.Root
				variant="outline"
				size="sm"
				class="mt-4"
				onclick={() => (isSettingsDialogOpen = true)}
			>
				<Gear class="mr-2 h-4 w-4" />
				Workspace Settings
			</Button.Root>
		{:else}
			<Button.Root
				variant="outline"
				size="sm"
				class="mt-4"
				onclick={() => (isLeaveDialogOpen = true)}
			>
				<Users class="mr-2 h-4 w-4" />
				Leave Workspace
			</Button.Root>
		{/if}
	</div>

	<Tabs.Root bind:value={activeTab} class="w-full">
		<Tabs.List>
			<Tabs.Trigger value="overview">Overview</Tabs.Trigger>
			<Tabs.Trigger value="channels">Channels</Tabs.Trigger>
			<Tabs.Trigger value="members">Members</Tabs.Trigger>
			{#if isAdmin}
				<Tabs.Trigger value="files">Files</Tabs.Trigger>
			{/if}
		</Tabs.List>

		<div class="mt-6">
			<Tabs.Content value="overview">
				<div class="grid gap-6 md:grid-cols-2">
					<!-- Quick Stats -->
					<Card.Root>
						<Card.Header>
							<Card.Title>Quick Stats</Card.Title>
						</Card.Header>
						<Card.Content>
							<div class="grid grid-cols-2 gap-4">
								<div>
									<p class="text-sm text-muted-foreground">Total Channels</p>
									<p class="text-2xl font-bold">{$workspace.channels.length}</p>
								</div>
								<div>
									<p class="text-sm text-muted-foreground">Total Members</p>
									<p class="text-2xl font-bold">{$workspace.members.length}</p>
								</div>
							</div>
						</Card.Content>
					</Card.Root>

					<!-- Recent Activity -->
					<Card.Root>
						<Card.Header>
							<Card.Title>Recent Activity</Card.Title>
						</Card.Header>
						<Card.Content>
							<p class="text-sm text-muted-foreground">Coming soon...</p>
						</Card.Content>
					</Card.Root>
				</div>
			</Tabs.Content>

			<Tabs.Content value="channels">
				<div class="grid gap-4">
					{#each $workspace.channels as channel}
						<Card.Root
							class="cursor-pointer transition-colors hover:bg-muted/50"
							onclick={() => handleChannelClick(channel)}
						>
							<Card.Header class="p-4">
								<Card.Title class="flex items-center gap-2">
									<Hash class="h-4 w-4 flex-shrink-0" />
									<span class="truncate">{channel.name}</span>
								</Card.Title>
								{#if channel.description}
									<Card.Description class="truncate">{channel.description}</Card.Description>
								{/if}
							</Card.Header>
						</Card.Root>
					{/each}
					{#if isAdmin}
						<Card.Root
							class="cursor-pointer transition-colors hover:bg-muted/50"
							onclick={() => (isChannelDialogOpen = true)}
						>
							<Card.Header class="p-4">
								<Card.Title class="flex items-center gap-2">
									<Plus class="h-4 w-4 flex-shrink-0" />
									<span>Create Channel</span>
								</Card.Title>
							</Card.Header>
						</Card.Root>
					{/if}
				</div>
			</Tabs.Content>

			<Tabs.Content value="members">
				<div class="grid gap-4">
					<!-- Owners -->
					{#if $workspace.members.filter((m) => m.role === 'owner').length > 0}
						<div>
							<h3 class="mb-4 text-lg font-semibold">Owners</h3>
							<div class="grid gap-4">
								{#each $workspace.members.filter((m) => m.role === 'owner') as member}
									<Card.Root>
										<Card.Header class="p-4">
											<div class="flex items-center gap-4">
												<Avatar.Root>
													<Avatar.Image
														src={member.avatar_url}
														alt={member.display_name || member.username}
													/>
													<Avatar.Fallback>
														{(member.display_name || member.username)[0].toUpperCase()}
													</Avatar.Fallback>
												</Avatar.Root>
												<div>
													<Card.Title>{member.display_name || member.username}</Card.Title>
													<Card.Description>{member.email}</Card.Description>
												</div>
											</div>
										</Card.Header>
									</Card.Root>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Admins -->
					{#if $workspace.members.filter((m) => m.role === 'admin').length > 0}
						<div>
							<h3 class="mb-4 text-lg font-semibold">Admins</h3>
							<div class="grid gap-4">
								{#each $workspace.members.filter((m) => m.role === 'admin') as member}
									<Card.Root>
										<Card.Header class="p-4">
											<div class="flex items-center gap-4">
												<Avatar.Root>
													<Avatar.Image
														src={member.avatar_url}
														alt={member.display_name || member.username}
													/>
													<Avatar.Fallback>
														{(member.display_name || member.username)[0].toUpperCase()}
													</Avatar.Fallback>
												</Avatar.Root>
												<div>
													<Card.Title>{member.display_name || member.username}</Card.Title>
													<Card.Description>{member.email}</Card.Description>
												</div>
											</div>
										</Card.Header>
									</Card.Root>
								{/each}
							</div>
						</div>
					{/if}

					<!-- Members -->
					{#if $workspace.members.filter((m) => m.role === 'member').length > 0}
						<div>
							<h3 class="mb-4 text-lg font-semibold">Members</h3>
							<div class="grid gap-4">
								{#each $workspace.members.filter((m) => m.role === 'member') as member}
									<Card.Root>
										<Card.Header class="p-4">
											<div class="flex items-center gap-4">
												<Avatar.Root>
													<Avatar.Image
														src={member.avatar_url}
														alt={member.display_name || member.username}
													/>
													<Avatar.Fallback>
														{(member.display_name || member.username)[0].toUpperCase()}
													</Avatar.Fallback>
												</Avatar.Root>
												<div>
													<Card.Title>{member.display_name || member.username}</Card.Title>
													<Card.Description>{member.email}</Card.Description>
												</div>
											</div>
										</Card.Header>
									</Card.Root>
								{/each}
							</div>
						</div>
					{/if}
				</div>
			</Tabs.Content>

			{#if isAdmin}
				<Tabs.Content value="files">
					<div class="grid gap-4">
						{#each $workspace.files as file}
							<Card.Root>
								<Card.Header class="p-4">
									<div class="flex items-center justify-between">
										<div>
											<Card.Title class="flex items-center gap-2">
												<FileText class="h-4 w-4 flex-shrink-0" />
												<span class="truncate">{decodeFileName(file.original_filename)}</span>
											</Card.Title>
											<Card.Description>
												{formatFileSize(file.file_size)} • Uploaded {new Date(
													file.uploaded_at
												).toLocaleDateString()}
											</Card.Description>
										</div>
										<div class="flex gap-2">
											<Button.Root variant="outline" size="sm" onclick={() => handleDownload(file)}>
												Download
											</Button.Root>
											<Button.Root
												variant="destructive"
												size="sm"
												onclick={() => handleDelete(file)}
											>
												Delete
											</Button.Root>
										</div>
									</div>
								</Card.Header>
							</Card.Root>
						{/each}
					</div>
				</Tabs.Content>
			{/if}
		</div>
	</Tabs.Root>
</div>

<ChannelCreateDialog bind:open={isChannelDialogOpen} />
<WorkspaceSettingsDialog bind:open={isSettingsDialogOpen} />
<LeaveWorkspaceDialog bind:open={isLeaveDialogOpen} />
