<script lang="ts">
	import * as Button from '$lib/components/ui/button';
	import { Plane, Paperclip } from 'lucide-svelte';
	import { onDestroy } from 'svelte';
	import { publishTyping, publishStoppedTyping } from '$lib/publishers/conversation.svelte';
	import { message_api } from '$lib/api/message.svelte';
	import { user_store } from '$lib/stores/user.svelte';
	import { file_api } from '$lib/api/file.svelte';
	import type { ICachedFile } from '$lib/types/file.svelte';
	import { fade, slide } from 'svelte/transition';
	import { conversation_store } from '$lib/stores/conversation.svelte';
	import { conversation_api } from '$lib/api/conversation.svelte';

	// File validation constants
	const ALLOWED_MIME_TYPES: readonly string[] = [
		'image/',
		'video/',
		'audio/',
		'application/pdf',
		'application/vnd.ms-excel',
		'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		'application/msword',
		'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
		'application/vnd.ms-powerpoint',
		'application/vnd.openxmlformats-officedocument.presentationml.presentation'
	] as const;

	let { conversation_id, parent_message_id } = $props<{
		conversation_id: string;
		parent_message_id?: string;
	}>();

	let message = $state('');
	let file: FileList | null = $state(null);
	let fileInput: HTMLInputElement;
	let typingTimeout: number;
	let isTyping = $state(false);
	let lastKeyPressTime = $state<number>(0);

	async function handleSubmit() {
		const currentMessage = message.trim();

		// Don't submit if there's no message and no file
		if (!currentMessage && !file) return;
		let file_id: string | undefined = undefined;
		try {
			// If there's a file, we need to upload it and get the returned file id.
			if (file) {
				const uploaded_file: ICachedFile = await file_api.uploadFile(file[0]);
				if (uploaded_file.id) {
					file_id = uploaded_file.id;
				}
			}

			// Send the message with parent_message_id if it exists
			message_api.createMessage(conversation_id, currentMessage, file_id, parent_message_id);

			// Clear the input
			message = '';
			file = null;
			isTyping = false;
			publishStoppedTyping(conversation_id, user_store.getMe().id);
		} catch (error) {
			console.error('Error sending message:', error);
			alert('Failed to send message. Please try again.');
		}
	}

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			handleSubmit();
		}
	}

	function removeFile(index: number) {
		file = null;
	}

	function handleFileSelect() {
		fileInput?.click();
	}

	function handleInput() {
		const now = Date.now();
		if (!message.trim()) {
			if (isTyping) {
				isTyping = false;
				publishStoppedTyping(conversation_id, user_store.getMe().id);
			}
			return;
		}

		if (!isTyping || now - lastKeyPressTime > 1000) {
			isTyping = true;
			publishTyping(conversation_id, user_store.getMe().id);
		}
		lastKeyPressTime = now;

		// Clear existing timeout before setting a new one
		if (typingTimeout) {
			clearTimeout(typingTimeout);
		}

		typingTimeout = setTimeout(() => {
			if (isTyping) {
				isTyping = false;
				publishStoppedTyping(conversation_id, user_store.getMe().id);
			}
		}, 4000) as unknown as number;
	}

	onDestroy(() => {
		if (typingTimeout) {
			clearTimeout(typingTimeout);
		}
		if (isTyping) {
			isTyping = false;
			publishStoppedTyping(conversation_id, user_store.getMe().id);
		}
	});
</script>

<div class="flex flex-col gap-2">
	<form
		class="flex items-center gap-3"
		onsubmit={(e) => {
			e.preventDefault();
			handleSubmit();
		}}
	>
		<div class="flex-1">
			<input
				type="text"
				placeholder={parent_message_id ? 'Reply to thread...' : 'Type a message...'}
				bind:value={message}
				onkeydown={handleKeyDown}
				oninput={handleInput}
				class="h-11 w-full rounded-md border bg-background px-4 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
			/>
		</div>

		<div class="flex items-center gap-2">
			<input
				type="file"
				bind:this={fileInput}
				bind:files={file}
				class="hidden"
				accept={ALLOWED_MIME_TYPES.join(',')}
			/>
			<Button.Root
				type="button"
				size="icon"
				variant="ghost"
				class="h-11 w-11"
				onclick={handleFileSelect}
			>
				<Paperclip class="h-5 w-5" />
			</Button.Root>
		</div>
		<Button.Root type="submit" size="icon" variant="default" class="h-11 w-11">
			<Plane class="h-5 w-5" />
		</Button.Root>
	</form>
	{#if file && file[0]}
		<div class="flex items-center gap-2 px-4">
			<div class="flex-1 truncate text-sm text-muted-foreground">
				{file[0].name}
			</div>
			<Button.Root
				type="button"
				variant="ghost"
				size="sm"
				onclick={() => removeFile(0)}
				class="h-6 px-2"
			>
				Remove
			</Button.Root>
		</div>
	{/if}
</div>
