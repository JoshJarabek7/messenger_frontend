<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { workspace } from '$lib/stores/workspace.svelte';
	import { workspaces } from '$lib/stores/workspaces.svelte';
	import { createEventDispatcher } from 'svelte';
	import { CheckCircle, XCircle } from 'phosphor-svelte';
	import { API_BASE_URL } from '$lib/config.ts';
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
	let slug = $state('');
	let checkTimeout: number;

	$effect(() => {
		if (name) {
			clearTimeout(checkTimeout);
			isChecking = true;
			error = null;

			// Generate slug preview
			slug = name
				.toLowerCase()
				.replace(/\s+/g, '-')
				.replace(/[^\w\-]+/g, '')
				.replace(/\-\-+/g, '-')
				.replace(/^-+/, '')
				.replace(/-+$/, '');

			checkTimeout = setTimeout(async () => {
				try {
					const response = await fetch(
						`${API_BASE_URL}/workspaces/exists/${encodeURIComponent(name)}`,
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
		} else {
			isNameAvailable = false;
			slug = '';
		}
	});

	function handleOpenChange(isOpen: boolean) {
		open = isOpen;
		if (!isOpen) {
			// Reset form state when dialog closes
			name = '';
			description = '';
			error = null;
			isNameAvailable = false;
			slug = '';
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

		isLoading = true;
		error = null;

		try {
			const response = await fetch('${API_BASE_URL}/workspaces', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					name: name.trim(),
					description: description.trim() || undefined
				}),
				credentials: 'include'
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.detail || 'Failed to create workspace');
			}

			const newWorkspace = await response.json();
			await workspaces.loadWorkspaces();
			await workspace.setActiveWorkspace(newWorkspace.id);
			handleOpenChange(false);
			dispatch('workspaceCreated', { workspace: newWorkspace });
		} catch (e: unknown) {
			error = e instanceof Error ? e.message : 'Failed to create workspace';
		} finally {
			isLoading = false;
		}
	}
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title>Create New Workspace</Dialog.Title>
			<Dialog.Description>Create a new workspace to collaborate with your team.</Dialog.Description>
		</Dialog.Header>

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
					{#if name}
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
				{#if slug}
					<p class="text-sm text-muted-foreground">Workspace URL: {slug}</p>
				{/if}
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
					{isLoading ? 'Creating...' : 'Create Workspace'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
