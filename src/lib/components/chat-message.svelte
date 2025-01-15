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

	let { message_id, conversation_id } = $props<{
		message_id: string;
		conversation_id: string;
	}>();

	// Common emojis for quick reactions
	const quickEmojis: string[] = ['👍', '❤️', '😂', '🎉', '🚀'];
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
		'✨'
	];

	let messageUser = $derived(
		user_store.getUser(message_store.getMessage(message_id)?.user_id ?? '')
	);
	let me = $derived(user_store.getMe());
	let isThreadOpen = $state(false);

	// Get reactions for this message reactively
	let reactionGroups = $derived(() => {
		const groups: { emoji: string; users: string[] }[] = [];
		const msg = message_store.getMessage(message_id);
		if (!msg) return groups;

		// Group reactions by emoji
		const reactionsByEmoji = new Map<string, Set<string>>();
		for (const reactionId of msg.reactions) {
			const reaction = reaction_store.getReaction(reactionId);
			if (!reaction) continue;

			if (!reactionsByEmoji.has(reaction.emoji)) {
				reactionsByEmoji.set(reaction.emoji, new Set());
			}
			reactionsByEmoji.get(reaction.emoji)?.add(reaction.user_id);
		}

		// Convert to array format for rendering
		for (const [emoji, users] of reactionsByEmoji) {
			groups.push({
				emoji,
				users: Array.from(users)
			});
		}

		return groups;
	});

	async function handleReaction(emoji: string) {
		try {
			const hasReacted = reactionGroups()
				.find((g) => g.emoji === emoji)
				?.users.includes(me.id);

			if (hasReacted) {
				// Find the reaction to remove
				const msg = message_store.getMessage(message_id);
				if (!msg) return;

				for (const reactionId of msg.reactions) {
					const reaction = reaction_store.getReaction(reactionId);
					if (reaction && reaction.emoji === emoji && reaction.user_id === me.id) {
						await reactionAPI.removeReaction(message_id, reactionId);
						break;
					}
				}
			} else {
				// Add new reaction
				await reactionAPI.addReaction(message_id, { emoji, message_id: message_id });
			}
		} catch (error) {
			console.error('Failed to handle reaction:', error);
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
</script>

<div class="group -mx-2 flex items-start gap-4 rounded-lg px-2 py-3 hover:bg-muted/50">
	<UserAvatar user_id={message_store.getMessage(message_id)?.user_id ?? ''} />
	<div class="min-w-0 flex-1">
		<div class="mb-0.5 flex items-center gap-2">
			<span class="truncate font-semibold">
				{messageUser?.display_name || messageUser?.username}
			</span>
			<span class="text-xs text-muted-foreground">
				{formatTime(message_store.getMessage(message_id)?.created_at ?? new Date().toISOString())}
			</span>
		</div>
		<div class="whitespace-pre-wrap break-words text-sm">
			{message_store.getMessage(message_id)?.content ?? ''}
		</div>

		<!-- File Attachment -->
		{#if message_store.getMessage(message_id)?.file_id}
			<Card.Root class="flex items-center gap-3 p-3">
				<div class="flex flex-1 items-center gap-3">
					<div class="flex h-10 w-10 items-center justify-center rounded-md border bg-muted">
						{#if file_store.getFile(message_store.getMessage(message_id)?.file_id!)?.file_type === 'image'}
							<Image class="h-5 w-5" />
						{:else if file_store.getFile(message_store.getMessage(message_id)?.file_id!)?.file_type === 'video'}
							<Video class="h-5 w-5" />
						{:else if file_store.getFile(message_store.getMessage(message_id)?.file_id!)?.file_type === 'audio'}
							<Music class="h-5 w-5" />
						{:else if file_store.getFile(message_store.getMessage(message_id)?.file_id!)?.file_type === 'pdf' || file_store.getFile(message_store.getMessage(message_id)?.file_id!)?.file_type === 'document'}
							<FileText class="h-5 w-5" />
						{:else}
							<File class="h-5 w-5" />
						{/if}
					</div>
					<div class="min-w-0 flex-1">
						<p class="truncate font-medium">
							{decodeFileName(
								file_store.getFile(message_store.getMessage(message_id)?.file_id!)?.file_name!
							)}
						</p>
						<p class="text-xs text-muted-foreground">
							{formatFileSize(
								file_store.getFile(message_store.getMessage(message_id)?.file_id!)?.file_size!
							)}
						</p>
					</div>
				</div>
				<Button.Root
					variant="outline"
					size="sm"
					onclick={() => handleFileClick(message_store.getMessage(message_id)?.file_id!)}
				>
					Download
				</Button.Root>
			</Card.Root>
		{/if}

		<!-- Reactions -->
		<div class="mt-1 flex flex-wrap gap-1">
			{#each reactionGroups() as group}
				<Button.Root
					variant={group.users.includes(me.id) ? 'secondary' : 'outline'}
					size="sm"
					class="h-8 items-center gap-1 px-2"
					onclick={() => handleReaction(group.emoji)}
				>
					<span class="text-xl">{group.emoji}</span>
					<span class="text-muted-foreground">{group.users.length}</span>
				</Button.Root>
			{/each}
		</div>

		<!-- Action Toolbar (visible on hover) -->
		<div class="mt-1 opacity-0 transition-opacity group-hover:opacity-100">
			<div class="flex items-center gap-1">
				<!-- Quick Reactions -->
				{#each quickEmojis as emoji}
					<Button.Root
						variant="ghost"
						size="sm"
						class="h-8 w-8 p-0"
						onclick={() => handleReaction(emoji)}
					>
						<span class="text-xl">{emoji}</span>
					</Button.Root>
				{/each}

				<!-- More Reactions -->
				<Popover.Root>
					<Popover.Trigger>
						<div>
							<Button.Root variant="ghost" size="sm" class="h-8 w-8 p-0">
								<Plus class="h-4 w-4" />
							</Button.Root>
						</div>
					</Popover.Trigger>
					<Popover.Content>
						<div class="grid grid-cols-8 gap-2 p-2">
							{#each allEmojis as emoji}
								<Button.Root
									variant="ghost"
									size="sm"
									class="h-8 w-8 p-0"
									onclick={() => handleReaction(emoji)}
								>
									<span class="text-xl">{emoji}</span>
								</Button.Root>
							{/each}
						</div>
					</Popover.Content>
				</Popover.Root>

				<!-- Reply Button -->
				<Button.Root
					variant="ghost"
					size="sm"
					class="h-8 gap-2 px-3"
					onclick={() => (isThreadOpen = !isThreadOpen)}
				>
					<MessageSquare class="h-4 w-4" />
					<span class="text-xs">Reply</span>
				</Button.Root>
			</div>
		</div>

		<!-- Thread/Replies -->
		{#if isThreadOpen || (message_store.getMessage(message_id)?.children && message_store.getMessage(message_id)?.children?.length! > 0)}
			<div class="mt-2">
				<Accordion.Root type="single" value={isThreadOpen ? 'replies' : undefined}>
					<Accordion.Item value="replies">
						<Accordion.Trigger class="flex items-center gap-2">
							<span class="text-sm">
								{message_store.getMessage(message_id)?.children?.length || 0}
								{message_store.getMessage(message_id)?.children?.length === 1 ? 'reply' : 'replies'}
							</span>
						</Accordion.Trigger>
						<Accordion.Content>
							<div class="space-y-2 border-l-2 border-dashed border-secondary p-4">
								{#each message_store.getMessage(message_id)?.children ?? [] as reply_id}
									<Self message_id={reply_id} {conversation_id} />
								{/each}

								<!-- Reply Input -->
								<div class="mt-4">
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
