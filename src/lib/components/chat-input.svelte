<script lang="ts">
	import * as Button from '$lib/components/ui/button';
	import { PaperPlaneRight, PaperclipHorizontal } from 'phosphor-svelte';
	import { onDestroy } from 'svelte';
	import { createEventDispatcher } from 'svelte';
	import { FileAPI } from '$lib/api/files';
	import { conversations } from '$lib/stores/conversations.svelte';

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

	const MAX_FILE_SIZE: number = 100 * 1024 * 1024; // 100MB

	const dispatch = createEventDispatcher<{
		submit: { content: string; fileIds?: string[] };
	}>();

	let { conversationId } = $props<{
		conversationId: string;
	}>();

	let message = $state('');
	let isUploading = $state(false);
	let file: FileList | null = $state(null);
	let fileInput: HTMLInputElement;
	let typingTimeout: number;
	let isTyping = $state(false);
	let lastKeyPressTime = $state<number>(0);

	async function uploadfile(): Promise<string[]> {
		// const file = $state.snapshot(file);
		if (!file) {
			console.log('No file to upload');
			return [];
		}

		console.log('Starting upload for file:', file[0].name, 'Length:', file[0].size);
		isUploading = true;
		const fileIds: string[] = [];

		try {
			if (!file[0].name || !file[0].type) {
				console.error('Invalid file object:', file);
			}

			console.log('Uploading file:', file[0].name, 'Type:', file[0].type, 'Size:', file[0].size);

			const uploadDetails = await FileAPI.getUploadUrl(file[0].name, file[0].type);
			console.log('Got upload URL for:', file[0].name, 'Details:', uploadDetails);
			console.log('File ID from response:', uploadDetails.metadata.file_id);

			const formData = new FormData();
			Object.entries(uploadDetails.upload_data.fields).forEach(([key, value]) => {
				formData.append(key, value as string);
			});
			formData.append('file', file[0]);

			console.log('Uploading to S3...');
			const uploadResponse = await fetch(uploadDetails.upload_data.url, {
				method: 'POST',
				body: formData
			});

			if (!uploadResponse.ok) {
				const error = await uploadResponse.text();
				console.error('Upload failed:', error);
				throw new Error(`Failed to upload file ${file[0].name}`);
			}

			console.log('Confirming upload with backend...');
			console.log('Using file ID:', uploadDetails.metadata.file_id);
			const fileData = await FileAPI.confirmUpload(uploadDetails.metadata.file_id, file[0].size);
			console.log('Upload confirmed for:', file[0].name, 'ID:', fileData.id);
			fileIds.push(fileData.id);

			return fileIds;
		} catch (error) {
			console.error('Error in uploadfile:', error);
			throw error;
		} finally {
			isUploading = false;
		}
	}

	async function handleSubmit() {
		const currentMessage = message.trim();

		// Don't submit if there's no message and no file
		if (!currentMessage && !file) return;

		try {
			let fileIds: string[] = [];

			// Upload file if present
			if (file) {
				fileIds = await uploadfile();
				console.log('File uploaded successfully, IDs:', fileIds);
			}

			// Clear typing state before sending message
			if (isTyping) {
				isTyping = false;
				conversations.sendTypingIndicator(conversationId, false);
			}

			// Dispatch the message with optional file IDs
			dispatch('submit', {
				content: currentMessage,
				fileIds: fileIds.length > 0 ? fileIds : undefined
			});

			// Only clear after successful upload and dispatch
			message = '';
			file = null;
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

		// Only send typing events if there's actual content
		if (!message.trim()) {
			if (isTyping) {
				isTyping = false;
				conversations.sendTypingIndicator(conversationId, false);
			}
			return;
		}

		// Clear existing timeout
		if (typingTimeout) {
			clearTimeout(typingTimeout);
		}

		// Send typing indicator only if it's been more than 1 second since last keypress
		if (!isTyping || now - lastKeyPressTime > 1000) {
			isTyping = true;
			lastKeyPressTime = now;
			conversations.sendTypingIndicator(conversationId, true);
		}

		// Set timeout to clear typing status after 4 seconds of no activity
		typingTimeout = setTimeout(() => {
			if (isTyping) {
				isTyping = false;
				conversations.sendTypingIndicator(conversationId, false);
			}
		}, 4000) as unknown as number;
	}

	onDestroy(() => {
		if (typingTimeout) {
			clearTimeout(typingTimeout);
		}
		// Make sure to clear typing state when component is destroyed
		if (isTyping) {
			isTyping = false;
			conversations.sendTypingIndicator(conversationId, false);
		}
	});
</script>

<div class="flex flex-col gap-2">
	<form class="flex items-center gap-3" onsubmit={handleSubmit}>
		<div class="flex-1">
			<input
				type="text"
				placeholder="Type a message..."
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
				disabled={isUploading}
			>
				<PaperclipHorizontal weight="bold" class="h-5 w-5" />
			</Button.Root>
		</div>
		<Button.Root
			type="submit"
			size="icon"
			variant="default"
			class="h-11 w-11"
			disabled={isUploading}
		>
			<PaperPlaneRight weight="bold" class="h-5 w-5" />
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
