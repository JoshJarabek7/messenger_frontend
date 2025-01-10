<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Avatar from '$lib/components/ui/avatar';
	import { workspace } from '$lib/stores/workspace.svelte';
	import { createEventDispatcher } from 'svelte';
	import { CheckCircle, XCircle, User, Plus, Trash } from 'phosphor-svelte';
	import { toast } from 'svelte-sonner';
	import type { User as UserType, WorkspaceMember } from '$lib/types';

	const dispatch = createEventDispatcher();
	let { open = $bindable(false) } = $props<{
		open?: boolean;
	}>();

	let name = $state('');
	let description = $state('');
	let isLoading = $state(false);
	let error = $state<string | null>(null);
	let isNameAvailable = $state(false);
	let isChecking = $state(false);
	let activeTab = $state('general');
	let members = $state<WorkspaceMember[]>([]);
	let isLoadingMembers = $state(false);

	// Initialize form with current workspace data
	$effect(() => {
		if (open && $workspace.activeWorkspace) {
			name = $workspace.activeWorkspace.name;
			description = $workspace.activeWorkspace.description || '';
			isNameAvailable = true;
			loadMembers();
		}
	});

	async function loadMembers() {
		if (!$workspace.activeWorkspaceId) return;

		isLoadingMembers = true;
		try {
			const response = await fetch(
				`http://localhost:8000/api/workspaces/${$workspace.activeWorkspaceId}/members`,
				{
					credentials: 'include'
				}
			);
			if (!response.ok) throw new Error('Failed to load members');
			members = await response.json();
		} catch (error) {
			console.error('Error loading members:', error);
			toast.error('Failed to load workspace members');
		} finally {
			isLoadingMembers = false;
		}
	}

	$effect(() => {
		if (name && name !== $workspace.activeWorkspace?.name) {
			clearTimeout(checkTimeout);
			isChecking = true;
			error = null;

			checkTimeout = setTimeout(async () => {
				try {
					const response = await fetch(
						`http://localhost:8000/api/workspaces/exists/${encodeURIComponent(name)}`,
						{
							credentials: 'include'
						}
					);
					if (!response.ok) throw new Error('Failed to check workspace name');
					const data = await response.json();
					isNameAvailable = !data.exists;
				} catch (e) {
					console.error('Error checking workspace name:', e);
				} finally {
					isChecking = false;
				}
			}, 300) as unknown as number;
		} else if (name === $workspace.activeWorkspace?.name) {
			isNameAvailable = true;
			isChecking = false;
		}
	});

	function handleOpenChange(isOpen: boolean) {
		open = isOpen;
		if (!isOpen) {
			// Reset form state when dialog closes
			error = null;
			activeTab = 'general';
		}
	}

	async function handleSubmit() {
		if (!name.trim()) {
			error = 'Workspace name is required';
			return;
		}

		if (!isNameAvailable) {
			error = 'This workspace name is already taken';
			return;
		}

		if (!$workspace.activeWorkspace?.id) {
			error = 'No active workspace';
			return;
		}

		isLoading = true;
		error = null;

		try {
			const response = await fetch(
				`http://localhost:8000/api/workspaces/${$workspace.activeWorkspace.id}`,
				{
					method: 'PUT',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						name: name.trim(),
						description: description.trim() || undefined
					}),
					credentials: 'include'
				}
			);

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.detail || 'Failed to update workspace');
			}

			const updatedWorkspace = await response.json();
			workspace.updateWorkspace(updatedWorkspace);
			toast.success('Workspace updated successfully');
			handleOpenChange(false);
		} catch (e: unknown) {
			error = e instanceof Error ? e.message : 'Failed to update workspace';
			toast.error(error);
		} finally {
			isLoading = false;
		}
	}

	async function handleRemoveMember(userId: string) {
		if (!$workspace.activeWorkspaceId) return;

		try {
			const response = await fetch(
				`http://localhost:8000/api/workspaces/${$workspace.activeWorkspaceId}/members/${userId}`,
				{
					method: 'DELETE',
					credentials: 'include'
				}
			);

			if (!response.ok) throw new Error('Failed to remove member');

			members = members.filter((member) => member.id !== userId);
			toast.success('Member removed successfully');
		} catch (error) {
			console.error('Error removing member:', error);
			toast.error('Failed to remove member');
		}
	}

	async function handleToggleAdmin(userId: string, currentRole: string) {
		if (!$workspace.activeWorkspaceId) return;

		try {
			const response = await fetch(
				`http://localhost:8000/api/workspaces/${$workspace.activeWorkspaceId}/members/${userId}`,
				{
					method: 'PATCH',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						role: currentRole === 'admin' ? 'member' : 'admin'
					}),
					credentials: 'include'
				}
			);

			if (!response.ok) throw new Error('Failed to update member role');

			const updatedMember = await response.json();
			members = members.map((member) =>
				member.id === userId ? { ...member, role: updatedMember.role } : member
			);
			toast.success(`Member ${currentRole === 'admin' ? 'demoted from' : 'promoted to'} admin`);
		} catch (error) {
			console.error('Error updating member role:', error);
			toast.error('Failed to update member role');
		}
	}

	let checkTimeout: number;
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
	<Dialog.Content class="sm:max-w-[600px]">
		<Dialog.Header>
			<Dialog.Title>Workspace Settings</Dialog.Title>
			<Dialog.Description>Manage your workspace settings and members.</Dialog.Description>
		</Dialog.Header>

		<Tabs.Root value={activeTab} onValueChange={(value) => (activeTab = value)} class="w-full">
			<Tabs.List>
				<Tabs.Trigger value="general">General</Tabs.Trigger>
				<Tabs.Trigger value="members">Members</Tabs.Trigger>
			</Tabs.List>

			<div class="mt-4">
				<Tabs.Content value="general">
					<form class="space-y-4" on:submit|preventDefault={handleSubmit}>
						<div class="space-y-2">
							<Label for="name">Workspace Name</Label>
							<div class="relative">
								<Input
									id="name"
									bind:value={name}
									placeholder="Enter workspace name"
									disabled={isLoading}
									class="pr-8"
								/>
								{#if name !== $workspace.activeWorkspace?.name}
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

						{#if isLoadingMembers}
							<div class="flex justify-center py-4">
								<div
									class="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"
								></div>
							</div>
						{:else}
							<div class="space-y-4">
								{#each members as member}
									<div class="flex items-center justify-between gap-4 rounded-lg border p-3">
										<div class="flex items-center gap-3">
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
												<p class="font-medium">{member.display_name || member.username}</p>
												<p class="text-sm text-muted-foreground">{member.email}</p>
											</div>
										</div>
										<div class="flex items-center gap-2">
											<Button
												variant="outline"
												size="sm"
												onclick={() => handleToggleAdmin(member.id, member.role)}
											>
												{member.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
											</Button>
											<Button
												variant="ghost"
												size="sm"
												class="text-destructive"
												onclick={() => handleRemoveMember(member.id)}
											>
												<Trash class="h-4 w-4" />
											</Button>
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				</Tabs.Content>
			</div>
		</Tabs.Root>
	</Dialog.Content>
</Dialog.Root>
