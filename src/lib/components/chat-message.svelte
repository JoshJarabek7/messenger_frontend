<script lang="ts">
	import { MessageAPI } from '$lib/api/messages';
	import * as Popover from '$lib/components/ui/popover';
	import * as Button from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Accordion from '$lib/components/ui/accordion';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Plus, FileText, Image, Video, Music, File } from 'lucide-svelte';
	import type { FileAttachment, Reaction, Message, User } from '$lib/types';
	import { auth } from '$lib/stores/auth.svelte';
	import { messages } from '$lib/stores/messages.svelte';
	import { users } from '$lib/stores/users.svelte';
	import Self from './chat-message.svelte';
	import ChatInput from './chat-input.svelte';
	import { toast } from 'svelte-sonner';
	import UserPresence from './user-presence.svelte';

	let { message, conversationId } = $props<{
		message: Message;
		conversationId?: string;
	}>();

	// Ensure conversationId has a value
	conversationId = conversationId || message.conversation_id;

	// Get user data from users store
	let messageUser = $state<User | null>(null);

	$effect(() => {
		if (message.user) {
			users.getUser(message.user.id).then((user) => {
				if (user) {
					messageUser = user;
				} else {
					messageUser = message.user; // Fallback to message user data
				}
			});
		}
	});

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

	interface ReactionGroup {
		emoji: string;
		users: User[];
	}

	// State variables
	let reactionGroups = $state<ReactionGroup[]>([]);
	let availableQuickEmojis = $state<string[]>([]);
	let availableAllEmojis = $state<string[]>([]);
	let showReactionPicker = $state(false);
	let replies = $state<Message[]>([]);
	let isLoadingReplies = $state(false);
	let accordionValue = $state<string | undefined>(undefined);
	let hasInitiallyLoadedReplies = $state(false);
	let downloadDialogOpen = $state(false);
	let selectedFile = $state<FileAttachment | null>(null);

	// Watch for changes to message replies
	$effect(() => {
		if (message.replies) {
			replies = message.replies;
		}
	});

	$effect(() => {
		// Get all emojis currently used in reactions
		const usedEmojis = new Set(message.reactions.map((r: Reaction) => r.emoji));

		// Filter out used emojis from quick emojis and all emojis
		availableQuickEmojis = quickEmojis.filter((emoji) => !usedEmojis.has(emoji));
		availableAllEmojis = allEmojis.filter((emoji) => !usedEmojis.has(emoji));

		// Calculate reaction groups and fetch user data
		const processReactions = async () => {
			const groups: ReactionGroup[] = [];
			for (const reaction of message.reactions) {
				const user = await users.getUser(reaction.user.id);
				const reactionUser = user || reaction.user;
				const existing = groups.find((g) => g.emoji === reaction.emoji);
				if (existing) {
					existing.users.push(reactionUser);
				} else {
					groups.push({ emoji: reaction.emoji, users: [reactionUser] });
				}
			}
			reactionGroups = groups;
		};
		processReactions();
	});

	// Load replies if there are any when the message is first loaded (only once)
	$effect(() => {
		if (!hasInitiallyLoadedReplies && message.reply_count > 0) {
			hasInitiallyLoadedReplies = true;
			loadReplies();
		}
	});

	function formatTime(date: string) {
		return new Date(date).toLocaleTimeString([], {
			hour: '2-digit',
			minute: '2-digit',
			hour12: true
		});
	}

	function formatFileSize(bytes: number) {
		const units = ['B', 'KB', 'MB', 'GB'];
		let size = bytes;
		let unitIndex = 0;

		while (size >= 1024 && unitIndex < units.length - 1) {
			size /= 1024;
			unitIndex++;
		}

		return `${size.toFixed(1)} ${units[unitIndex]}`;
	}

	function decodeFileName(filename: string) {
		try {
			return decodeURIComponent(filename);
		} catch (error) {
			console.error('Error decoding filename:', error);
			return filename;
		}
	}

	async function handleReaction(emoji: string) {
		console.log('Handling reaction:', emoji, 'for message:', message.id);
		try {
			const currentUser = $auth.user;
			if (!currentUser) {
				console.log('No current user');
				return;
			}

			const existingReaction = message.reactions.find(
				(r: Reaction) => r.emoji === emoji && r.user.id === currentUser.id
			);

			console.log('Found existing reaction:', existingReaction);

			let updatedMessage: Message;
			if (existingReaction) {
				console.log('Attempting to remove reaction:', existingReaction.id);
				try {
					updatedMessage = await MessageAPI.removeReaction(message.id, existingReaction.id);
					console.log('Successfully removed reaction. New message state:', updatedMessage);
				} catch (error) {
					console.error('Failed to remove reaction:', error);
					return;
				}
			} else {
				console.log('Attempting to add reaction:', emoji);
				try {
					updatedMessage = await MessageAPI.addReaction(message.id, emoji);
					console.log('Successfully added reaction. New message state:', updatedMessage);
				} catch (error) {
					console.error('Failed to add reaction:', error);
					return;
				}
			}

			// Update the message in the store
			messages.updateMessage(updatedMessage);

			// Update local state
			message = updatedMessage;

			// Force recomputation of reaction groups
			reactionGroups = message.reactions.reduce((groups: ReactionGroup[], reaction: Reaction) => {
				const existing = groups.find((g: ReactionGroup) => g.emoji === reaction.emoji);
				if (existing) {
					existing.users.push(reaction.user);
				} else {
					groups.push({ emoji: reaction.emoji, users: [reaction.user] });
				}
				return groups;
			}, [] as ReactionGroup[]);

			// Update available emojis
			const usedEmojis = new Set(message.reactions.map((r: Reaction) => r.emoji));
			availableQuickEmojis = quickEmojis.filter((emoji) => !usedEmojis.has(emoji));
			availableAllEmojis = allEmojis.filter((emoji) => !usedEmojis.has(emoji));
		} catch (error) {
			console.error('Error in handleReaction:', error);
		}
	}

	async function loadReplies() {
		if (isLoadingReplies) return;

		isLoadingReplies = true;
		try {
			const threadReplies = await MessageAPI.getThread(message.id);

			// Update the parent message with the loaded replies
			const updatedMessage = {
				...message,
				replies: threadReplies,
				reply_count: threadReplies.length
			};

			// Update the message in the store
			messages.updateMessage(updatedMessage);

			// Update local state
			message = updatedMessage;
			replies = threadReplies;
		} catch (error) {
			console.error('Error loading replies:', error);
		} finally {
			isLoadingReplies = false;
		}
	}

	async function handleReply(event: CustomEvent<{ content: string }>) {
		try {
			// Just send the reply and let the WebSocket event handle the update
			await MessageAPI.reply(message.id, event.detail.content);
		} catch (error) {
			console.error('Error sending reply:', error);
		}
	}

	function formatUserList(users: User[]): string {
		return users.map((u) => u.display_name || u.username).join(', ');
	}

	async function handleFileClick(file: FileAttachment) {
		try {
			// Open in new tab to handle CORS properly
			window.open(file.download_url, '_blank');
		} catch (error) {
			console.error('Error opening file:', error);
			toast.error('Failed to open file. Please try again.');
		}
	}

	function handleAccordionChange(value: string | undefined) {
		accordionValue = value;
	}
</script>

<div class="group -mx-2 flex items-start gap-4 rounded-lg px-2 py-3 hover:bg-muted/50">
	<div class="relative">
		{#if messageUser?.avatar_url}
			<img
				src={messageUser.avatar_url}
				alt={messageUser.display_name || messageUser.username}
				class="h-10 w-10 rounded-full"
			/>
		{:else}
			<div class="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
				<span class="text-sm font-medium uppercase">
					{(messageUser?.display_name || messageUser?.username || '?')[0]}
				</span>
			</div>
		{/if}
		<UserPresence userId={message.user.id} />
	</div>
	<div class="min-w-0 flex-1">
		<div class="mb-0.5 flex items-center gap-2">
			<span class="truncate font-semibold">
				{messageUser?.display_name || messageUser?.username}
			</span>
			<span class="text-xs text-muted-foreground">
				{formatTime(message.created_at)}
			</span>
		</div>
		<div class="whitespace-pre-wrap break-words text-sm">
			{message.content}
		</div>

		<!-- File Attachments -->
		{#if message.attachments?.length}
			<div class="mt-2 space-y-2">
				{#each message.attachments as file}
					<Card.Root class="flex items-center gap-3 p-3">
						<div class="flex flex-1 items-center gap-3">
							<div class="flex h-10 w-10 items-center justify-center rounded-md border bg-muted">
								{#if file.file_type === 'image'}
									<Image class="h-5 w-5" />
								{:else if file.file_type === 'video'}
									<Video class="h-5 w-5" />
								{:else if file.file_type === 'audio'}
									<Music class="h-5 w-5" />
								{:else if file.file_type === 'pdf' || file.file_type === 'document'}
									<FileText class="h-5 w-5" />
								{:else}
									<File class="h-5 w-5" />
								{/if}
							</div>
							<div class="min-w-0 flex-1">
								<p class="truncate font-medium">{decodeFileName(file.original_filename)}</p>
								<p class="text-xs text-muted-foreground">{formatFileSize(file.file_size)}</p>
							</div>
						</div>
						<Button.Root variant="outline" size="sm" onclick={() => handleFileClick(file)}>
							Download
						</Button.Root>
					</Card.Root>
				{/each}
			</div>
		{/if}

		<!-- Reactions -->
		<div class="mt-1 flex flex-wrap gap-1">
			{#each reactionGroups as group}
				<Button.Root
					variant={group.users.some((u) => u.id === $auth.user?.id) ? 'secondary' : 'outline'}
					size="sm"
					class="h-8 items-center gap-1 px-2"
					onclick={() => handleReaction(group.emoji)}
				>
					<span class="text-xl">{group.emoji}</span>
					<span class="text-muted-foreground">{group.users.length}</span>
				</Button.Root>
			{/each}
		</div>

		<!-- Reaction Toolbar (visible on hover) -->
		<div class="mt-1 opacity-0 transition-opacity group-hover:opacity-100">
			<div class="flex items-center gap-1">
				{#each availableQuickEmojis as emoji}
					<Button.Root
						variant="ghost"
						size="sm"
						class="h-8 w-8 p-0"
						onclick={() => handleReaction(emoji)}
					>
						<span class="text-xl">{emoji}</span>
					</Button.Root>
				{/each}

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
							{#each availableAllEmojis as emoji}
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
			</div>
		</div>

		<!-- Thread/Replies -->
		<div class="mt-2">
			<Accordion.Root type="single" value={accordionValue} onValueChange={handleAccordionChange}>
				<Accordion.Item value="replies">
					<Accordion.Trigger class="flex items-center gap-2">
						{#if isLoadingReplies}
							<span class="text-sm">Loading replies...</span>
						{:else}
							<span class="text-sm"
								>{replies.length} {replies.length === 1 ? 'reply' : 'replies'}</span
							>
						{/if}
					</Accordion.Trigger>
					<Accordion.Content>
						<div class="space-y-2 border-l-2 border-dashed border-secondary p-4">
							{#each replies as reply}
								<Self message={reply} />
							{/each}

							<!-- Reply Input -->
							<div class="mt-4">
								<ChatInput {conversationId} on:submit={handleReply} />
							</div>
						</div>
					</Accordion.Content>
				</Accordion.Item>
			</Accordion.Root>
		</div>
	</div>
</div>
