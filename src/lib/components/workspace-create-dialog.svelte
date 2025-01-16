<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { CheckCircle, XCircle } from 'lucide-svelte';
	import { workspace_api } from '$lib/api/workspace.svelte';
	import { ui_store } from '$lib/stores/ui.svelte';
	import { search_api } from '$lib/api/search.svelte';
	import { buildWorkspace } from '$lib/helpers.svelte';

	let name = $state('');
	let description = $state('');
	let isLoading = $state(false);
	let error = $state<string | null>(null);
	let isNameAvailable = $state<boolean | null>(null);
	let isChecking = $state(false);
	let slug = $state('');
	let checkTimeout: number;

	function handleOpenChange(isOpen: boolean) {
		ui_store.toggleCreateWorkspaceDialog();
		if (!isOpen) {
			// Reset form state when dialog closes
			name = '';
			description = '';
			error = null;
			isNameAvailable = null;
			slug = '';
			if (checkTimeout) {
				clearTimeout(checkTimeout);
			}
		}
	}

	async function checkWorkspaceName() {
		if (!name.trim()) {
			isNameAvailable = null;
			return;
		}

		try {
			isChecking = true;
			isNameAvailable = (await search_api.search(name, 'WORKSPACES')).length === 0;
			error = isNameAvailable ? null : 'This workspace name is already taken';
		} catch (e) {
			console.error('Error checking workspace name:', e);
			error = 'Failed to check workspace name availability';
			isNameAvailable = null;
		} finally {
			isChecking = false;
		}
	}

	// Debounced workspace name check
	function handleNameInput() {
		if (checkTimeout) {
			clearTimeout(checkTimeout);
		}

		if (!name.trim()) {
			isNameAvailable = null;
			error = null;
			return;
		}

		isChecking = true;
		checkTimeout = setTimeout(checkWorkspaceName, 500) as unknown as number;
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
			// Close the dialog first to prevent UI lock
			handleOpenChange(false);

			const workspace = await workspace_api.createWorkspace({
				name: name.trim(),
				description: description.trim() || undefined
			});

			// Build the workspace
			await buildWorkspace(workspace.id);

			// Select the workspace after a short delay to ensure all states are updated
			setTimeout(() => {
				ui_store.selectWorkspace(workspace.id);
			}, 100);
		} catch (e) {
			console.error('Error creating workspace:', e);
			error = 'Failed to create workspace';
		} finally {
			isLoading = false;
		}
	}

	// Generate slug in real-time
	$effect(() => {
		slug = name
			.trim()
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '');
	});
</script>

<Dialog.Root open={ui_store.getCreateWorkspaceDialogOpen()} onOpenChange={handleOpenChange}>
	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title>Create New Workspace</Dialog.Title>
			<Dialog.Description>Create a new workspace to collaborate with your team.</Dialog.Description>
		</Dialog.Header>

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
						oninput={handleNameInput}
					/>
					{#if name}
						<div class="absolute right-2 top-1/2 -translate-y-1/2">
							{#if isChecking}
								<div
									class="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"
								></div>
							{:else if isNameAvailable}
								<CheckCircle class="h-4 w-4 text-green-500" />
							{:else if isNameAvailable === false}
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
