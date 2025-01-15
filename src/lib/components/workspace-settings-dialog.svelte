<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Tabs from '$lib/components/ui/tabs';
	import { CheckCircle, XCircle, Plus, Trash, LogOut } from 'lucide-svelte';
	import { toast } from 'svelte-sonner';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';

	import { workspace_store } from '$lib/stores/workspace.svelte';
	import { ui_store } from '$lib/stores/ui.svelte';
	import { workspace_api } from '$lib/api/workspace.svelte';
	import { user_store } from '$lib/stores/user.svelte';
	import { unbuildWorkspace } from '$lib/helpers.svelte';
	import UserAvatar from './user-avatar.svelte';

	let name: string = workspace_store.getWorkspace(ui_store.workspaceSelected()!)?.name || '';
	let description: string =
		workspace_store.getWorkspace(ui_store.workspaceSelected()!)?.description || '';

	let isNameAvailable = true;
	let error: string | null = null;
	let isLoading = false;
	let isChecking = false;
	let isLeavingWorkspace = false;

	async function handleSubmit() {
		if (
			workspace_store.getRole(ui_store.workspaceSelected()!, user_store.getMe()!.id) !== 'admin' &&
			workspace_store.getRole(ui_store.workspaceSelected()!, user_store.getMe()!.id) !== 'owner'
		) {
			error = 'You do not have permission to update this workspace.';
			return;
		}

		if (!name.trim()) {
			error = 'Workspace name is required';
			return;
		}

		isNameAvailable = !(await workspace_api.doesWorkspaceExist(name));

		if (!isNameAvailable) {
			error = 'This workspace name is already taken';
			return;
		}

		isLoading = true;
		error = null;

		try {
			await workspace_api.updateWorkspace({
				id: ui_store.workspaceSelected()!,
				name: name.trim(),
				description: description.trim() || undefined
			});
			toast.success('Workspace updated successfully');
			ui_store.toggleWorkspaceSettings();
		} catch (e: unknown) {
			error = e instanceof Error ? e.message : 'Failed to update workspace';
			toast.error(error);
		} finally {
			isLoading = false;
		}
	}

	async function handleRemoveMember(userId: string) {
		if (!ui_store.workspaceSelected()) return;
		if (
			workspace_store.getRole(ui_store.workspaceSelected()!, user_store.getMe()!.id) !== 'admin' &&
			workspace_store.getRole(ui_store.workspaceSelected()!, user_store.getMe()!.id) !== 'owner'
		) {
			error = 'You do not have permission to remove members from this workspace.';
			return;
		}
		await workspace_api.removeMember(ui_store.workspaceSelected()!, user_store.getMe()!.id);
	}

	async function handleRemoveAdmin(userId: string) {
		if (!ui_store.workspaceSelected()) return;
		if (
			workspace_store.getRole(ui_store.workspaceSelected()!, user_store.getMe()!.id) !== 'owner'
		) {
			error = 'You do not have permission to remove admins from this workspace.';
			return;
		}
		await workspace_api.removeAdmin(ui_store.workspaceSelected()!, userId);
	}

	async function handleToggleAdmin(userId: string, currentRole: 'admin' | 'member') {
		if (!ui_store.workspaceSelected()) return;
		if (currentRole === 'admin') {
			await workspace_api.updateMemberRole(ui_store.workspaceSelected()!, userId, 'member');
		} else {
			await workspace_api.updateMemberRole(ui_store.workspaceSelected()!, userId, 'admin');
		}
	}

	async function handleLeaveWorkspace() {
		if (!ui_store.workspaceSelected()!) return;
		isLeavingWorkspace = true;
		try {
			const isOwner =
				workspace_store.getWorkspace(ui_store.workspaceSelected()!)?.created_by_id ===
				user_store.getMe()!.id;
			if (isOwner) {
				await workspace_api.deleteWorkspace(ui_store.workspaceSelected()!);
			} else {
				await workspace_api.leaveWorkspace(ui_store.workspaceSelected()!);
			}
			ui_store.unselectChannel();
			ui_store.unselectDirectMessageConversation();
			ui_store.toggleWorkspaceSettings();
			unbuildWorkspace(ui_store.workspaceSelected()!);
			ui_store.unselectWorkspace();
			ui_store.leave_workspace_dialog_open = false;
		} finally {
			isLeavingWorkspace = false;
		}
	}

	async function handleNameInputChange() {
		isChecking = true;
		isNameAvailable = !(await workspace_api.doesWorkspaceExist(name));
		isChecking = false;
	}
</script>

<Dialog.Root
	open={ui_store.getWorkspaceSettingsOpen()}
	onOpenChange={ui_store.toggleWorkspaceSettings}
>
	<Dialog.Content class="sm:max-w-[600px]">
		<Dialog.Header>
			<Dialog.Title>Workspace Settings</Dialog.Title>
			<Dialog.Description>Manage your workspace settings and members.</Dialog.Description>
		</Dialog.Header>

		<Tabs.Root
			value={ui_store.getWorkspaceSettingsTab()}
			onValueChange={(value) =>
				ui_store.setWorkspaceSettingsTab(value as 'general' | 'members' | 'channels' | 'files')}
			class="w-full"
		>
			<Tabs.List>
				<Tabs.Trigger value="general">General</Tabs.Trigger>
				<Tabs.Trigger value="members">Members</Tabs.Trigger>
			</Tabs.List>

			<div class="mt-4">
				<Tabs.Content value="general">
					<form
						class="space-y-4"
						onsubmit={(e) => {
							e.preventDefault();
							handleSubmit();
						}}
					>
						<div class="space-y-2">
							<Label for="name">Workspace Name</Label>
							<div class="relative">
								<Input
									id="name"
									bind:value={name}
									placeholder="Enter workspace name"
									disabled={isLoading}
									class="pr-8"
									oninput={handleNameInputChange}
								/>
								{#if name !== workspace_store.getWorkspace(ui_store.workspaceSelected()!)?.name}
									<div class="absolute right-2 top-1/2 -translate-y-1/2">
										{#if isChecking}
											<div
												class="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"
											></div>
										{:else if isNameAvailable}
											<CheckCircle class="h-4 w-4 text-green-500" />
										{:else}
											<XCircle class="h-4 w-4 text-destructive" />
										{/if}
									</div>
								{/if}
							</div>
						</div>

						<div class="space-y-2">
							<Label for="description">Description (Optional)</Label>
							<Textarea
								id="description"
								bind:value={description}
								placeholder="Enter workspace description"
								disabled={isLoading}
							/>
						</div>

						{#if error}
							<p class="text-sm text-destructive">{error}</p>
						{/if}

						<Dialog.Footer>
							<Button type="submit" disabled={isLoading || !isNameAvailable}>
								{isLoading ? 'Saving...' : 'Save Changes'}
							</Button>
						</Dialog.Footer>
					</form>

					<div class="mt-8">
						<div class="rounded-lg border border-destructive/50 p-4">
							<h3 class="text-lg font-semibold text-destructive">Danger Zone</h3>
							<p class="mt-2 text-sm text-muted-foreground">
								Actions here can't be undone. Please be certain.
							</p>
							<div class="mt-4">
								<Button
									type="button"
									variant="destructive"
									class="w-full"
									onclick={() => handleLeaveWorkspace()}
								>
									<LogOut class="mr-2 h-4 w-4" />
									{workspace_store.getWorkspace(ui_store.workspaceSelected()!)?.created_by_id ===
									user_store.getMe()!.id
										? 'Delete Workspace'
										: 'Leave Workspace'}
								</Button>
							</div>
						</div>
					</div>
				</Tabs.Content>

				<Tabs.Content value="members">
					<div class="space-y-4">
						<div class="flex items-center justify-between">
							<h4 class="text-sm font-medium">Workspace Members</h4>
							<Button variant="outline" size="sm">
								<Plus class="mr-2 h-4 w-4" />
								Invite Member
							</Button>
						</div>

						<div class="space-y-4">
							{#each workspace_store
								.getWorkspace(ui_store.workspaceSelected()!)
								?.members?.values() ?? [] as member_id}
								<div class="flex items-center justify-between gap-4 rounded-lg border p-3">
									<div class="flex items-center gap-3">
										<UserAvatar user_id={member_id} />
										<div>
											<p class="font-medium">
												{user_store.getUser(member_id)?.display_name ||
													user_store.getUser(member_id)?.username}
											</p>
											<p class="text-sm text-muted-foreground">
												{user_store.getUser(member_id)?.email}
											</p>
										</div>
									</div>
									<div class="flex items-center gap-2">
										<Button
											variant="outline"
											size="sm"
											onclick={() =>
												handleToggleAdmin(
													member_id,
													workspace_store.getRole(ui_store.workspaceSelected()!, member_id) as
														| 'admin'
														| 'member'
												)}
											disabled={member_id === user_store.getMe()!.id ||
												workspace_store.getRole(ui_store.workspaceSelected()!, member_id) ===
													'owner' ||
												workspace_store.getRole(
													ui_store.workspaceSelected()!,
													user_store.getMe()!.id
												) === 'member'}
										>
											{workspace_store.getRole(ui_store.workspaceSelected()!, member_id) === 'admin'
												? 'Remove Admin'
												: 'Make Admin'}
										</Button>
										<Button
											variant="ghost"
											size="sm"
											class="text-destructive"
											disabled={member_id === user_store.getMe()!.id ||
												workspace_store.getRole(ui_store.workspaceSelected()!, member_id) ===
													'owner' ||
												workspace_store.getRole(
													ui_store.workspaceSelected()!,
													user_store.getMe()!.id
												) === 'member'}
											onclick={() => handleRemoveMember(member_id)}
										>
											<Trash class="h-4 w-4" />
										</Button>
									</div>
								</div>
							{/each}
						</div>
					</div>
				</Tabs.Content>
			</div>
		</Tabs.Root>
	</Dialog.Content>
</Dialog.Root>

<AlertDialog.Root
	open={ui_store.getLeaveWorkspaceDialogOpen()}
	onOpenChange={ui_store.toggleLeaveWorkspaceDialog}
>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>
				{workspace_store.getWorkspace(ui_store.workspaceSelected()!)?.created_by_id ===
				user_store.getMe()!.id
					? 'Delete Workspace'
					: 'Leave Workspace'}
			</AlertDialog.Title>
			<AlertDialog.Description>
				{#if workspace_store.getWorkspace(ui_store.workspaceSelected()!)?.created_by_id === user_store.getMe()!.id}
					This will permanently delete the workspace and all of its data, including:
					<ul class="mt-2 list-inside list-disc space-y-1">
						<li>All channels and their messages</li>
						<li>All files and attachments</li>
						<li>All direct messages within the workspace</li>
						<li>All member data and settings</li>
					</ul>
					<p class="mt-2">This action cannot be undone.</p>
				{:else}
					Are you sure you want to leave this workspace? You'll lose access to all channels and
					conversations.
				{/if}
			</AlertDialog.Description>
		</AlertDialog.Header>
		<AlertDialog.Footer>
			<AlertDialog.Cancel disabled={isLeavingWorkspace}>Cancel</AlertDialog.Cancel>
			<AlertDialog.Action
				class="bg-destructive text-destructive-foreground hover:bg-destructive/90"
				disabled={isLeavingWorkspace}
				onclick={handleLeaveWorkspace}
			>
				{#if isLeavingWorkspace}
					<div class="flex items-center gap-2">
						<div
							class="h-4 w-4 animate-spin rounded-full border-2 border-background border-t-transparent"
						></div>
						{workspace_store.getWorkspace(ui_store.workspaceSelected()!)?.created_by_id ===
						user_store.getMe()!.id
							? 'Deleting...'
							: 'Leaving...'}
					</div>
				{:else}
					{workspace_store.getWorkspace(ui_store.workspaceSelected()!)?.created_by_id ===
					user_store.getMe()!.id
						? 'Yes, delete workspace'
						: 'Yes, leave workspace'}
				{/if}
			</AlertDialog.Action>
		</AlertDialog.Footer>
	</AlertDialog.Content>
</AlertDialog.Root>
