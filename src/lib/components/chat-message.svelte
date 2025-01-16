<script lang="ts">
	import * as Popover from '$lib/components/ui/popover';
	import * as Button from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Accordion from '$lib/components/ui/accordion';
	import { Plus, FileText, Image, Video, Music, File, MessageSquare } from 'lucide-svelte';
	import Self from './chat-message.svelte';
	import ChatInput from './chat-input.svelte';
	import { formatTime, formatFileSize, decodeFileName } from '$lib/helpers.svelte';
	import { user_store } from '$lib/stores/user.svelte';
	import { file_store } from '$lib/stores/file.svelte';
	import { message_store } from '$lib/stores/messages.svelte';
	import { reaction_store } from '$lib/stores/reaction.svelte';
	import { reactionAPI } from '$lib/api/reaction.svelte';
	import UserAvatar from './user-avatar.svelte';
	import { message_api } from '$lib/api/message.svelte';
	import type { IReaction } from '$lib/types/messages.svelte';
	import { flip } from 'svelte/animate';
	import { scale } from 'svelte/transition';

	let { message_id, conversation_id } = $props<{
		message_id: string;
		conversation_id: string;
	}>();

	// Common emojis for quick reactions
	const quickEmojis = ['👍', '❤️', '😂', '🎉', '🚀', '👀', '🔥', '✨'];
	const allEmojis: string[] = [
		'😀',
		'😂',
		'🥰',
		'😍',
		'🤔',
		'😮',
		'😢',
		'😡',
		'👍',
		'👎',
		'❤️',
		'🎉',
		'🔥',
		'💯',
		'🙏',
		'✨',
		'👋',
		'🤝',
		'👀',
		'💪',
		'🎯',
		'🌟',
		'🎨',
		'🚀'
	];

	let messageUser = $derived(
		user_store.getUser(message_store.getMessage(message_id)?.user_id ?? '')
	);
	let me = $derived(user_store.getMe());
	let isThreadOpen = $state(false);

	let message = $derived(message_store.getMessage(message_id));
	$inspect(message);

	// Get reaction map
	let emojiMap = $derived(() => {
		if (!message?.reactions) return {};

		const reactionCounts: Record<string, { count: number; hasReacted: boolean }> = {};
		for (const reaction of message.reactions.values()) {
			if (!reaction?.emoji) continue;

			if (!reactionCounts[reaction.emoji]) {
				reactionCounts[reaction.emoji] = { count: 0, hasReacted: false };
			}
			reactionCounts[reaction.emoji].count++;

			if (reaction.user_id === me?.id) {
				reactionCounts[reaction.emoji].hasReacted = true;
			}
		}
		return reactionCounts;
	});

	// Get available emojis (excluding ones already used)
	let availableQuickEmojis = $derived(
		quickEmojis.filter((emoji) => {
			const map = emojiMap();
			return !Object.keys(map).includes(emoji);
		})
	);

	let availableAllEmojis = $derived(
		allEmojis.filter((emoji) => {
			const map = emojiMap();
			return !Object.keys(map).includes(emoji);
		})
	);

	async function handleReaction(emoji: string) {
		if (!message || !me) return;

		// Find if user has already reacted with this emoji
		const existingReaction = Array.from(message.reactions.values()).find(
			(r) => r?.emoji === emoji && r?.user_id === me.id
		);

		try {
			if (existingReaction) {
				await reactionAPI.removeReaction(message_id, existingReaction.id);
				message_store.removeReaction(message_id, existingReaction.id);
				reaction_store.removeReaction(existingReaction.id);
			} else {
				const newReaction = await reactionAPI.addReaction(message_id, { emoji, message_id });
				if (newReaction && newReaction.id) {
					message_store.addReaction(message_id, newReaction);
					reaction_store.addReaction(message_id, newReaction);
				}
			}
		} catch (error) {
			console.error('Failed to handle reaction:', error);
			await refreshMessage();
		}
	}

	async function refreshMessage() {
		try {
			const msg = await message_api.getMessage(message_id);
			if (msg) {
				message_store.addMessage(msg);
			}
		} catch (error) {
			console.error('Failed to refresh message:', error);
		}
	}

	function handleFileClick(file_id: string) {
		const blob = file_store.getFile(file_id)?.file_blob;
		if (!blob) {
			console.error('File blob not found');
			return;
		}
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = file_store.getFile(file_id)?.file_name || 'download';
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	function hasUserReacted(emoji: string): boolean {
		const msg = message_store.getMessage(message_id);
		if (!msg?.reactions || !me?.id) return false;

		const messageReactions = Array.from(msg.reactions.values());
		return messageReactions.some((r) => r.emoji === emoji && r.user_id === me.id);
	}
</script>

<!-- Main message container with hover detection -->
<div
	class="group -mx-2 flex items-start gap-4 rounded-lg px-2 py-3 transition-colors duration-200 ease-in-out hover:bg-muted/50"
>
	<!-- User avatar section -->
	<UserAvatar user_id={message?.user_id ?? ''} />

	<!-- Message content section -->
	<div class="min-w-0 flex-1">
		<!-- Message header -->
		<div class="mb-0.5 flex items-center gap-2 transition-opacity">
			<span class="truncate font-semibold text-primary hover:text-primary/90">
				{messageUser?.display_name || messageUser?.username}
			</span>
			<span class="text-xs text-muted-foreground/75">
				{formatTime(message?.created_at ?? new Date().toISOString())}
			</span>
		</div>

		<!-- Message text content -->
		<div
			class="whitespace-pre-wrap break-words text-sm text-foreground opacity-95 transition-all duration-200 ease-in-out group-hover:opacity-100"
		>
			{message?.content ?? ''}
		</div>

		<!-- File attachment section if present -->
		{#if message?.file_id}
			<div in:slide={{ duration: 200 }}>
				<Card.Root
					class="mt-2 flex items-center gap-3 p-3 transition-all duration-200 hover:bg-muted/50 hover:shadow-sm"
				>
					<div class="flex flex-1 items-center gap-3">
						<div
							class="flex h-10 w-10 items-center justify-center rounded-md border bg-muted/50 transition-colors group-hover:bg-muted"
						>
							{#if file_store.getFile(message.file_id)?.file_type === 'image'}
								<Image class="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
							{:else if file_store.getFile(message.file_id)?.file_type === 'video'}
								<Video class="h-5 w-5" />
							{:else if file_store.getFile(message.file_id)?.file_type === 'audio'}
								<Music class="h-5 w-5" />
							{:else if file_store.getFile(message.file_id)?.file_type === 'pdf' || file_store.getFile(message.file_id)?.file_type === 'document'}
								<FileText class="h-5 w-5" />
							{:else}
								<File class="h-5 w-5" />
							{/if}
						</div>
						<div class="min-w-0 flex-1">
							<p class="truncate font-medium text-primary/90 transition-colors hover:text-primary">
								{decodeFileName(file_store.getFile(message.file_id)?.file_name!)}
							</p>
							<p class="text-xs text-muted-foreground/75">
								{formatFileSize(file_store.getFile(message.file_id)?.file_size!)}
							</p>
						</div>
					</div>
					<Button.Root
						variant="outline"
						size="sm"
						class="transition-all duration-200 hover:bg-primary hover:text-primary-foreground"
						onclick={() => handleFileClick(message.file_id!)}
					>
						Download
					</Button.Root>
				</Card.Root>
			</div>
		{/if}

		<!-- Existing reactions display -->
		{#if Object.keys(emojiMap()).length > 0}
			<div class="mt-3 flex flex-wrap gap-2">
				{#each Object.entries(emojiMap()) as [emoji, data] (emoji)}
					<div animate:flip={{ duration: 300 }}>
						<button
							in:scale={{ duration: 200 }}
							out:scale={{ duration: 150 }}
							class="group relative flex h-12 min-w-[3.5rem] items-center justify-center gap-2 rounded-full px-4
							transition-all duration-300 ease-in-out hover:scale-105
							{data.hasReacted
								? 'bg-primary text-primary-foreground hover:bg-primary/90'
								: 'bg-secondary text-secondary-foreground hover:bg-secondary/80'}"
							onclick={() => handleReaction(emoji)}
						>
							<span class="text-2xl transition-transform duration-200 group-hover:scale-110">
								{emoji}
							</span>
							<span class="ml-1 text-base font-semibold">
								{data.count}
							</span>
						</button>
					</div>
				{/each}
			</div>
		{/if}

		<!-- Quick reactions and actions toolbar -->
		<div
			class="mt-2 opacity-0 transition-all duration-300 ease-in-out group-hover:translate-y-0 group-hover:opacity-100"
			style="transform: translateY(4px)"
		>
			<div class="flex items-center gap-2">
				<!-- Quick reaction buttons -->
				{#each availableQuickEmojis as emoji}
					<button
						class="flex h-12 w-12 items-center justify-center rounded-full
							bg-secondary text-secondary-foreground
							transition-all duration-300
							hover:scale-105 hover:bg-primary
							hover:text-primary-foreground active:scale-95"
						onclick={() => handleReaction(emoji)}
					>
						<span class="text-2xl transition-transform duration-200 hover:scale-110">
							{emoji}
						</span>
					</button>
				{/each}

				<!-- More reactions popover -->
				<Popover.Root>
					<Popover.Trigger>
						<button
							class="flex h-12 w-12 items-center justify-center rounded-full
								bg-secondary text-secondary-foreground
								transition-all duration-300
								hover:scale-105 hover:bg-primary
								hover:text-primary-foreground active:scale-95"
						>
							<Plus class="h-6 w-6" />
						</button>
					</Popover.Trigger>
					<Popover.Content class="p-4 duration-200 animate-in fade-in-50 zoom-in-95">
						<div class="grid grid-cols-6 gap-2">
							{#each availableAllEmojis as emoji}
								<button
									class="flex h-12 w-12 items-center justify-center rounded-full
										bg-secondary text-secondary-foreground
										transition-all duration-300
										hover:scale-105 hover:bg-primary
										hover:text-primary-foreground active:scale-95"
									onclick={() => handleReaction(emoji)}
								>
									<span class="text-2xl transition-transform duration-200 hover:scale-110">
										{emoji}
									</span>
								</button>
							{/each}
						</div>
					</Popover.Content>
				</Popover.Root>

				<!-- Reply button -->
				<Button.Root
					variant="ghost"
					size="lg"
					class="h-12 gap-2 px-4 transition-all duration-200
						hover:bg-primary hover:text-primary-foreground
						active:scale-95"
					onclick={() => (isThreadOpen = !isThreadOpen)}
				>
					<MessageSquare class="h-5 w-5" />
					<span class="text-sm">Reply</span>
				</Button.Root>
			</div>
		</div>

		<!-- Thread/Replies section -->
		{#if isThreadOpen || (message?.children && message.children.length > 0)}
			<div class="mt-2 duration-200 animate-in slide-in-from-left-1">
				<Accordion.Root type="single" value={isThreadOpen ? 'replies' : undefined}>
					<Accordion.Item value="replies">
						<Accordion.Trigger
							class="flex items-center gap-2 text-muted-foreground/75 transition-colors hover:text-foreground"
						>
							<span class="text-sm">
								{message?.children?.length || 0}
								{message?.children?.length === 1 ? 'reply' : 'replies'}
							</span>
						</Accordion.Trigger>
						<Accordion.Content class="duration-200 animate-in slide-in-from-top-1">
							<div
								class="space-y-2 border-l-2 border-dashed border-secondary/50 p-4 transition-colors hover:border-secondary"
							>
								{#each message?.children ?? [] as reply_id}
									<Self message_id={reply_id} {conversation_id} />
								{/each}
								<div class="mt-4 duration-300 animate-in fade-in-0">
									<ChatInput {conversation_id} parent_message_id={message_id} />
								</div>
							</div>
						</Accordion.Content>
					</Accordion.Item>
				</Accordion.Root>
			</div>
		{/if}
	</div>
</div>
