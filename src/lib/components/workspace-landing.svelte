<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Button from '$lib/components/ui/button';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Hash, Users, FileText, Cog, Plus } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import ChannelCreateDialog from '$lib/components/channel-create-dialog.svelte';
	import WorkspaceSettingsDialog from '$lib/components/workspace-settings-dialog.svelte';
	import LeaveWorkspaceDialog from '$lib/components/leave-workspace-dialog.svelte';
	import { workspace_store } from '$lib/stores/workspace.svelte';
	import { user_store } from '$lib/stores/user.svelte';
	import { ui_store } from '$lib/stores/ui.svelte';
	import { getWorkspaceInfo, buildWorkspace } from '$lib/helpers.svelte';
	import UserAvatar from './user-avatar.svelte';
	import { decodeFileName } from '$lib/helpers.svelte';
	import { file_api } from '$lib/api/file.svelte';
	import type { ICachedFile } from '$lib/types/file.svelte';

	let { workspace_id } = $props();

	let workspaceInfo = $derived(() => {
		if (!workspace_id) return null;
		const workspace = workspace_store.getWorkspace(workspace_id);
		if (!workspace) return null;
		const members = Array.from(workspace.members);
		const admins = Array.from(workspace.admins);
		const owner = workspace.created_by_id;
		const channels = Array.from(workspace.channels);
		const files = Array.from(workspace.files);
		return getWorkspaceInfo(workspace_id)();
	});

	const members = $derived(() => {
		if (!workspaceInfo()) return [];
		return Array.from(workspaceInfo()!.members);
	});

	const admins = $derived(() => {
		if (!workspaceInfo()) return [];
		return Array.from(workspaceInfo()!.admins);
	});

	const owner = $derived(() => {
		if (!workspaceInfo()) return null;
		return workspaceInfo()!.owner;
	});

	const peopleCount = $derived(() => {
		return members.length + admins.length + 1;
	});

	async function handleDownload(file: ICachedFile) {
		try {
			if (!file.file_blob) {
				toast.error('File content not available');
				return;
			}

			// Create a blob URL from the file blob
			const blobUrl = URL.createObjectURL(file.file_blob);

			// Create a temporary anchor element
			const a = document.createElement('a');
			a.href = blobUrl;
			a.download = decodeFileName(file.file_name) || 'download';

			// Trigger the download
			document.body.appendChild(a);
			a.click();

			// Clean up
			document.body.removeChild(a);
			URL.revokeObjectURL(blobUrl);
		} catch (error) {
			console.error('Download error:', error);
			toast.error('Failed to download file');
		}
	}

	async function handleDelete(file: ICachedFile) {
		try {
			await file_api.deleteFile(file.id);
			toast.success('File deleted successfully');
			// Refresh workspace info
			// workspaceInfo = getWorkspaceInfo(ui_store.workspaceSelected()!)();
		} catch (error) {
			console.error('Delete error:', error);
			toast.error('Failed to delete file');
		}
	}
</script>

{#key workspaceInfo()}
	<div class="container mx-auto max-w-6xl p-6">
		<div class="mb-8">
			<h1 class="mb-2 text-3xl font-bold">
				{workspaceInfo()?.name}
			</h1>
			{#if workspaceInfo()?.description}
				<p class="text-muted-foreground">
					{workspaceInfo()?.description}
				</p>
			{/if}
			{#if workspaceInfo()
				?.admins.map((admin) => admin.id)
				.includes(user_store.getMe()!.id) || workspaceInfo()?.owner.id === user_store.getMe()!.id}
				<Button.Root
					variant="outline"
					size="sm"
					class="mt-4"
					onclick={() => ui_store.toggleWorkspaceSettings()}
				>
					<Cog class="mr-2 h-4 w-4" />
					Workspace Settings
				</Button.Root>
			{:else}
				<Button.Root
					variant="outline"
					size="sm"
					class="mt-4"
					onclick={() => (ui_store.leave_workspace_dialog_open = true)}
				>
					<Users class="mr-2 h-4 w-4" />
					Leave Workspace
				</Button.Root>
			{/if}
		</div>

		<Tabs.Root bind:value={ui_store.workspace_landing_tab} class="w-full">
			<Tabs.List>
				<Tabs.Trigger value="overview">Overview</Tabs.Trigger>
				<Tabs.Trigger value="channels">Channels</Tabs.Trigger>
				<Tabs.Trigger value="members">Members</Tabs.Trigger>
				<Tabs.Trigger value="files">Files</Tabs.Trigger>
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
										<p class="text-2xl font-bold">
											{Array.from(
												workspace_store.getWorkspace(ui_store.workspaceSelected()!).channels
											).length}
										</p>
									</div>
									<div>
										<p class="text-sm text-muted-foreground">Total Members</p>
										<p class="text-2xl font-bold">
											{Array.from(
												workspace_store.getWorkspace(ui_store.workspaceSelected()!).members
											).length}
										</p>
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
						{#if workspaceInfo()}
							{#each workspaceInfo()!.channels as channel}
								<Card.Root
									class="cursor-pointer transition-colors hover:bg-muted/50"
									onclick={() => ui_store.selectChannel(channel.id)}
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
							{#if Array.from(workspaceInfo()!.admins)
								.map((admin) => admin.id)
								.includes(user_store.getMe()!.id)}
								<Card.Root
									class="cursor-pointer transition-colors hover:bg-muted/50"
									onclick={() => ui_store.toggleCreateChannelDialog()}
								>
									<Card.Header class="p-4">
										<Card.Title class="flex items-center gap-2">
											<Plus class="h-4 w-4 flex-shrink-0" />
											<span>Create Channel</span>
										</Card.Title>
									</Card.Header>
								</Card.Root>
							{/if}
						{/if}
					</div>
				</Tabs.Content>

				<Tabs.Content value="members">
					<div class="grid gap-4">
						<!-- Owners -->
						{#if workspaceInfo()}
							<div>
								<h3 class="mb-4 text-lg font-semibold">Owner</h3>
								<div class="grid gap-4">
									<Card.Root>
										<Card.Header class="p-4">
											<div class="flex items-center gap-4">
												<UserAvatar user_id={owner()!.id} />
												<div>
													<Card.Title
														>{workspaceInfo()!.owner.display_name ||
															workspaceInfo()!.owner.username}</Card.Title
													>
													<Card.Description>{workspaceInfo()!.owner.email}</Card.Description>
												</div>
											</div>
										</Card.Header>
									</Card.Root>
								</div>
							</div>
						{/if}
						<!-- Admins -->
						{#if workspaceInfo()?.admins}
							<div>
								<h3 class="mb-4 text-lg font-semibold">Admins</h3>
								<div class="grid gap-4">
									{#each admins() as admin}
										<Card.Root>
											<Card.Header class="p-4">
												<div class="flex items-center gap-4">
													<UserAvatar user_id={admin.id} />
													<div>
														<Card.Title>{admin.display_name || admin.username}</Card.Title>
														<Card.Description>{admin.email}</Card.Description>
													</div>
												</div>
											</Card.Header>
										</Card.Root>
									{/each}
								</div>
							</div>
						{/if}

						<!-- Members -->
						{#if workspaceInfo()?.members}
							<div>
								<h3 class="mb-4 text-lg font-semibold">Members</h3>
								<div class="grid gap-4">
									{#each members() as member}
										<Card.Root>
											<Card.Header class="p-4">
												<div class="flex items-center gap-4">
													<UserAvatar user_id={member.id} />
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

				{#if workspaceInfo()?.files}
					<Tabs.Content value="files">
						<div class="grid gap-4">
							{#each workspaceInfo()!.files as file}
								<Card.Root>
									<Card.Header class="p-4">
										<div class="flex items-center justify-between">
											<div>
												<Card.Title class="flex items-center gap-2">
													<FileText class="h-4 w-4 flex-shrink-0" />
													<span class="truncate">{decodeFileName(file?.file_name)}</span>
												</Card.Title>
											</div>
											<div class="flex gap-2">
												<Button.Root
													variant="outline"
													size="sm"
													onclick={() => handleDownload(file!)}
												>
													Download
												</Button.Root>
												<Button.Root
													variant="destructive"
													size="sm"
													onclick={() => handleDelete(file!)}
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

	<ChannelCreateDialog />
	<WorkspaceSettingsDialog />
	<LeaveWorkspaceDialog />
{/key}
