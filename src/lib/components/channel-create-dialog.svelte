<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { CheckCircle, XCircle } from 'lucide-svelte';
	import { channel_api } from '$lib/api/channel.svelte';
	import { workspace_store } from '$lib/stores/workspace.svelte';
	import { ui_store } from '$lib/stores/ui.svelte';

	let name = $state('');
	let description = $state('');
	let isLoading = $state(false);
	let error = $state<string | null>(null);
	let isNameAvailable = $state<boolean | null>(null);
	let isChecking = $state(false);
	let slug = $state('');
	let checkTimeout: number;

	function handleOpenChange(isOpen: boolean) {
		ui_store.toggleCreateChannelDialog();
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

	async function checkChannelName() {
		if (!name.trim() || !ui_store.workspaceSelected()) {
			isNameAvailable = null;
			return;
		}

		try {
			isChecking = true;
			const exists = await channel_api.doesChannelExist(name, ui_store.workspaceSelected()!);
			isNameAvailable = !exists;
			error = exists ? 'This channel name is already taken' : null;
		} catch (e) {
			console.error('Error checking channel name:', e);
			error = 'Failed to check channel name availability';
			isNameAvailable = null;
		} finally {
			isChecking = false;
		}
	}

	// Debounced channel name check
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
		checkTimeout = setTimeout(checkChannelName, 500) as unknown as number;
	}

	async function handleSubmit() {
		if (!name.trim()) {
			error = 'Channel name is required';
			return;
		}

		if (!isNameAvailable) {
			error = 'This channel name is already taken';
			return;
		}

		if (!ui_store.workspaceSelected()) {
			error = 'No active workspace';
			return;
		}

		isLoading = true;
		error = null;
		try {
			const channel = await channel_api.createChannel(ui_store.workspaceSelected()!, {
				name: name,
				description: description || undefined,
				workspace_id: ui_store.workspaceSelected()!
			});
			// Wait for 1 second to ensure the channel is created via websocket
			await new Promise((resolve) => setTimeout(resolve, 1000));
			ui_store.selectChannel(channel.id);
			handleOpenChange(false);
		} catch (e) {
			console.error('Error creating channel:', e);
			error = 'Failed to create channel';
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

<Dialog.Root open={ui_store.getCreateChannelDialogOpen()} onOpenChange={handleOpenChange}>
	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title>Create New Channel</Dialog.Title>
			<Dialog.Description>
				Create a new channel in {workspace_store.getWorkspace(ui_store.workspaceSelected()!)?.name}.
			</Dialog.Description>
		</Dialog.Header>

		<form
			class="space-y-4"
			onsubmit={(e) => {
				e.preventDefault();
				handleSubmit();
			}}
		>
			<div class="space-y-2">
				<Label for="name">Channel Name</Label>
				<div class="relative">
					<Input
						id="name"
						bind:value={name}
						placeholder="Enter channel name"
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
					<p class="text-sm text-muted-foreground">Channel URL: #{slug}</p>
				{/if}
			</div>

			<div class="space-y-2">
				<Label for="description">Description (Optional)</Label>
				<Textarea
					id="description"
					bind:value={description}
					placeholder="Enter channel description"
					disabled={isLoading}
				/>
			</div>

			{#if error}
				<p class="text-sm text-destructive">{error}</p>
			{/if}

			<Dialog.Footer>
				<Button type="submit" disabled={isLoading || !isNameAvailable}>
					{isLoading ? 'Creating...' : 'Create Channel'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
