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
	import { onMount } from 'svelte';
	import { FileAPI } from '$lib/api/files';
	import { toast } from 'svelte-sonner';
	import ChannelCreateDialog from './channel-create-dialog.svelte';
	import WorkspaceSettingsDialog from './workspace-settings-dialog.svelte';

	let isAdmin = $state(false);
	let workspaceMembers = $state<WorkspaceMember[]>([]);
	let workspaceFiles = $state<FileAttachment[]>([]);
	let activeTab = $state('overview');
	let isLoading = $state({
		members: false,
		files: false
	});
	let isChannelDialogOpen = $state(false);
	let isSettingsDialogOpen = $state(false);
	let memberData = $state<{
		users: Record<string, User>;
		owner_ids: string[];
		admin_ids: string[];
		member_ids: string[];
	}>({
		users: {},
		owner_ids: [],
		admin_ids: [],
		member_ids: []
	});

	// Check if current user is admin and load workspace data
	$effect(() => {
		if ($workspace.activeWorkspaceId && $auth.user) {
			loadWorkspaceData();
		}
	});

	async function loadWorkspaceData() {
		try {
			// Load workspace members
			isLoading.members = true;
			const membersResponse = await fetch(
				`http://localhost:8000/api/workspaces/${$workspace.activeWorkspaceId}/members`,
				{
					credentials: 'include'
				}
			);
			if (membersResponse.ok) {
				memberData = await membersResponse.json();
				// Check if current user is admin
				const userId = $auth.user?.id;
				isAdmin = userId
					? memberData.owner_ids.includes(userId) || memberData.admin_ids.includes(userId)
					: false;

				// Convert to array for display
				workspaceMembers = [
					...memberData.owner_ids.map((id) => ({
						...memberData.users[id],
						role: 'owner' as const
					})),
					...memberData.admin_ids.map((id) => ({
						...memberData.users[id],
						role: 'admin' as const
					})),
					...memberData.member_ids.map((id) => ({
						...memberData.users[id],
						role: 'member' as const
					}))
				];
			} else {
				console.log('Failed to load workspace members');
				workspaceMembers = [];
				isAdmin = false;
			}
		} catch (error) {
			console.error('Error loading workspace members:', error);
			workspaceMembers = [];
			isAdmin = false;
		} finally {
			isLoading.members = false;
		}

		if (isAdmin) {
			try {
				// Load workspace files
				isLoading.files = true;
				const filesResponse = await fetch(
					`http://localhost:8000/api/workspaces/${$workspace.activeWorkspaceId}/files`,
					{
						credentials: 'include'
					}
				);
				if (filesResponse.ok) {
					workspaceFiles = await filesResponse.json();
				} else {
					console.log('Failed to load workspace files');
					workspaceFiles = [];
				}
			} catch (error) {
				console.error('Error loading workspace files:', error);
				workspaceFiles = [];
			} finally {
				isLoading.files = false;
			}
		}
	}

	function handleChannelClick(channelId: string) {
		workspace.setActiveChannel(channelId);
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
			// Instead of fetching, open in new tab to handle CORS properly
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
			// Remove the file from the local state
			workspaceFiles = workspaceFiles.filter((f) => f.id !== file.id);
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
									<p class="text-2xl font-bold">{workspaceMembers.length}</p>
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
							onclick={() => handleChannelClick(channel.id)}
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
						<Button.Root
							variant="outline"
							class="w-full"
							onclick={() => (isChannelDialogOpen = true)}
						>
							<Plus class="mr-2 h-4 w-4" />
							Create Channel
						</Button.Root>
					{/if}
				</div>
			</Tabs.Content>

			<Tabs.Content value="members">
				<div class="grid gap-4">
					<Card.Root>
						<Card.Header>
							<Card.Title>Workspace Members</Card.Title>
						</Card.Header>
						<Card.Content>
							{#if isLoading.members}
								<div class="flex justify-center py-4">
									<div
										class="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
									/>
								</div>
							{:else if workspaceMembers.length === 0}
								<p class="text-sm text-muted-foreground">No members found</p>
							{:else}
								<div class="grid gap-4">
									{#each workspaceMembers as member}
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
												<div class="flex items-center gap-2">
													<p class="font-medium">{member.display_name || member.username}</p>
													{#if member.role === 'owner'}
														<span class="text-xs text-muted-foreground">(Owner)</span>
													{:else if member.role === 'admin'}
														<span class="text-xs text-muted-foreground">(Admin)</span>
													{/if}
												</div>
												<p class="text-sm text-muted-foreground">{member.email}</p>
											</div>
										</div>
									{/each}
								</div>
							{/if}
						</Card.Content>
					</Card.Root>

					{#if isAdmin}
						<Button.Root variant="outline" onclick={() => (isSettingsDialogOpen = true)}>
							<Users class="mr-2 h-4 w-4" />
							Manage Members
						</Button.Root>
					{/if}
				</div>
			</Tabs.Content>

			{#if isAdmin}
				<Tabs.Content value="files">
					<div class="grid gap-4">
						{#if isLoading.files}
							<div class="flex justify-center py-4">
								<div
									class="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
								/>
							</div>
						{:else if workspaceFiles.length === 0}
							<Card.Root>
								<Card.Content class="flex flex-col items-center justify-center py-8">
									<FileText class="mb-4 h-12 w-12 text-muted-foreground" />
									<p class="text-sm text-muted-foreground">No files uploaded yet</p>
								</Card.Content>
							</Card.Root>
						{:else}
							{#each workspaceFiles as file}
								<Card.Root>
									<Card.Header>
										<Card.Title class="flex items-center gap-2">
											<FileText class="h-4 w-4" />
											{decodeFileName(file.original_filename)}
										</Card.Title>
										<Card.Description>
											{formatFileSize(file.file_size)} • Uploaded {new Date(
												file.uploaded_at
											).toLocaleDateString()}
										</Card.Description>
									</Card.Header>
									<Card.Footer>
										<Button.Root
											variant="outline"
											size="sm"
											onclick={(e) => {
												e.preventDefault();
												handleDownload(file);
											}}
										>
											Download
										</Button.Root>
										<Button.Root
											variant="ghost"
											size="sm"
											class="text-destructive"
											onclick={(e) => {
												e.preventDefault();
												handleDelete(file);
											}}
										>
											Delete
										</Button.Root>
									</Card.Footer>
								</Card.Root>
							{/each}
						{/if}

						<Button.Root variant="outline">
							<Plus class="mr-2 h-4 w-4" />
							Upload File
						</Button.Root>
					</div>
				</Tabs.Content>
			{/if}
		</div>
	</Tabs.Root>
</div>

<ChannelCreateDialog bind:open={isChannelDialogOpen} />
<WorkspaceSettingsDialog bind:open={isSettingsDialogOpen} />
