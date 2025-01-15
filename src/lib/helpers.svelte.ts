import { conversation_store } from '$lib/stores/conversation.svelte';
import { message_store } from '$lib/stores/messages.svelte';
import type { IBuiltMessage } from '$lib/types/messages.svelte';
import { channel_store } from '$lib/stores/channel.svelte';
import { user_store } from '$lib/stores/user.svelte';
import { workspace_store } from '$lib/stores/workspace.svelte';
import { file_store } from '$lib/stores/file.svelte';
import { conversation_api } from '$lib/api/conversation.svelte';
import { message_api } from '$lib/api/message.svelte';
import { file_api } from '$lib/api/file.svelte';
import { workspace_api } from '$lib/api/workspace.svelte';
import { channel_api } from '$lib/api/channel.svelte';
import { user_api } from '$lib/api/user.svelte';
import { reaction_store } from '$lib/stores/reaction.svelte';
import type { ICachedFile } from './types/file.svelte';
import { auth_api } from './api/auth.svelte';



export function getConversationMessages(conversation_id: string) {
	return () => {
		const conversation = conversation_store.getConversation(conversation_id);
		if (!conversation || !Array.isArray(conversation.messages)) {
			console.log('No valid conversation or messages array found');
			return [];
		}

		console.log('getConversationMessages - Raw conversation:', conversation);
		console.log('getConversationMessages - Raw messages:', conversation.messages.map(id => message_store.getMessage(id)));

		const messages = conversation.messages
			.map((id) => {
				const message = message_store.getMessage(id);
				if (!message) return null;

				// Build reactions map
				const reactions = Array.from(message.reactions || []).map((reaction_id) =>
					reaction_store.getReaction(reaction_id)
				);
				const reactions_map: Record<string, Set<string>> = {};
				reactions.forEach((reaction) => {
					if (!reaction) return;
					if (!reactions_map[reaction.emoji]) {
						reactions_map[reaction.emoji] = new Set();
					}
					reactions_map[reaction.emoji].add(reaction.user_id);
				});

				// Build child messages if this is a root message
				let thread_messages: IBuiltMessage[] = [];
				if (!message.parent_id && message.children && message.children.length > 0) {
					console.log(`getConversationMessages - Building thread for message ${message.id}:`, message.children);
					thread_messages = message.children
						.map((child_id) => {
							const child = message_store.getMessage(child_id);
							if (!child) return null;
							console.log(`getConversationMessages - Thread message ${child_id}:`, child);

							// Create reactions map for child message
							const child_reactions: Record<string, Set<string>> = {};
							Array.from(child.reactions || []).forEach((reaction_id) => {
								const reaction = reaction_store.getReaction(reaction_id);
								if (!reaction) return;
								if (!child_reactions[reaction.emoji]) {
									child_reactions[reaction.emoji] = new Set();
								}
								child_reactions[reaction.emoji].add(reaction.user_id);
							});

							const built_child: IBuiltMessage = {
								id: child.id,
								user_id: child.user_id,
								content: child.content,
								file_id: child.file_id || undefined,
								reactions: child_reactions,
								children: [],
								parent_id: child.parent_id,
								created_at: child.created_at,
								updated_at: child.updated_at
							};
							return built_child;
						})
						.filter((msg): msg is IBuiltMessage => msg !== null);
				}

				const built_message: IBuiltMessage = {
					id: message.id,
					user_id: message.user_id,
					content: message.content,
					file_id: message.file_id || undefined,
					reactions: reactions_map,
					children: thread_messages,
					parent_id: message.parent_id,
					created_at: message.created_at,
					updated_at: message.updated_at
				};

				// Only return root messages or messages without a parent
				if (!message.parent_id) {
					console.log(`getConversationMessages - Built root message ${message.id}:`, built_message);
					return built_message;
				}
				return null;
			})
			.filter((msg): msg is IBuiltMessage => msg !== null);

		console.log('getConversationMessages - Final messages array:', messages);
		return messages;
	};
}

export function getWorkspaceInfo(workspace_id: string) {
	const info = $derived(() => {
		const workspace = workspace_store.getWorkspace(workspace_id);

		if (!workspace) return null;

		const members = Array.from(workspace.members).map((id: string) => user_store.getUser(id));

		const admins = Array.from(workspace.admins).map((id: string) => user_store.getUser(id));

		const owner = user_store.getUser(workspace.created_by_id);

		const user_count = members.length + admins.length + (owner ? 1 : 0);

		const channels = Array.from(workspace.channels).map((id: string) =>
			channel_store.getChannel(id)
		);

		const files = Array.from(workspace.files)
			.map((id) => file_store.getFile(id))
			.filter(Boolean);

		return {
			members: members,
			admins: admins,
			owner: owner,
			user_count: user_count,
			name: workspace.name,
			description: workspace.description,
			image_s3_key: workspace.s3_key,
			files: files,
			channels: channels
		};
	});
	return info;
}

export function getWorkspacesList() {
	const list = $derived(() => {
		const workspaces = workspace_store.getWorkspaces();
		return workspaces.map((workspace) => ({
			id: workspace.id,
			name: workspace.name,
			slug: workspace.slug
		}));
	});
	return list;
}

export async function buildFile(file_id: string): Promise<void> {
	const file_exists = file_store.getFile(file_id);
	if (file_exists) return;
	const file = await file_api.getFileInfo(file_id);
	if (!file) {
		throw new Error('Unable to get file info.');
	}
	const file_blob = await file_api.getFileBlob(file.id);
	if (!file_blob) {
		throw new Error('Unable to get file blob.');
	}
	file.file_blob = file_blob;
	file_store.setFile(file);
}

export async function buildUser(user_id: string): Promise<void> {
	const user_exists = user_store.getUser(user_id);
	const was_online = user_exists?.online || false;

	if (user_exists && user_exists.s3_key && !file_store.getFile(user_exists.s3_key)) {
		const file = await file_api.getFileInfo(user_exists.s3_key);
		if (!file) {
			throw new Error('Unable to get file info.');
		}
		const file_blob = await file_api.getFileBlob(file.id);
		if (file_blob) {
			file.file_blob = file_blob;
		}
		file_store.setFile(file);
	}
	if (user_exists) return;
	const user = await user_api.getUser(user_id);
	if (!user) {
		throw new Error('Unable to get user.');
	}
	if (user.s3_key && !file_store.getFile(user.s3_key)) {
		const file = await file_api.getFileInfo(user.s3_key);
		if (!file) {
			throw new Error('Unable to get file info.');
		}
		const file_blob = await file_api.getFileBlob(file.id);
		if (file_blob) {
			file.file_blob = file_blob;
		}
		file_store.setFile(file);
	}
	// Preserve online status when building user
	user.online = was_online;
	user_store.addUser(user);
}

export async function buildMessage(message_id: string): Promise<void> {
	const message_exists = message_store.getMessage(message_id);
	if (message_exists) return;

	try {
		const message = await message_api.getMessage(message_id);
		if (!message) {
			console.warn(`Message ${message_id} not found`);
			return;
		}

		// Skip if user_id is undefined or null
		if (!message.user_id) {
			console.warn(`Message ${message_id} has no user_id, skipping`);
			return;
		}

		// Initialize empty arrays/sets if not present
		message.reactions = message.reactions || new Set<string>();
		message.children = message.children || [];

		// If this is a reply, ensure parent exists first
		if (message.parent_id) {
			const parentMessage = message_store.getMessage(message.parent_id);
			if (!parentMessage) {
				console.log(`Parent message ${message.parent_id} not found, fetching it...`);
				await buildMessage(message.parent_id);
			}
			// After ensuring parent exists, add this message to parent's children
			const parent = message_store.getMessage(message.parent_id);
			if (parent) {
				console.log(`Adding message ${message.id} as child to parent ${parent.id}`);
				if (!parent.children) {
					parent.children = [];
				}
				if (!parent.children.includes(message.id)) {
					parent.children.push(message.id);
					message_store.addMessage(parent); // Update parent in store
				}
			}
		}

		// Build user who sent the message
		try {
			await buildUser(message.user_id);
		} catch (error) {
			console.error('Error building user for message:', error);
			// Remove message from store since we couldn't build the user
			message_store.removeMessage(message.id);
			return;
		}

		// Build file if message has an attachment
		if (message.file_id) {
			try {
				await buildFile(message.file_id);
			} catch (error) {
				console.error('Error building file for message:', error);
				// Don't throw error here, just log it
			}
		}

		// Add message to store
		message_store.addMessage(message);

		// Build child messages
		if (message.children && message.children.length > 0) {
			for (const child_id of message.children) {
				try {
					await buildMessage(child_id);
				} catch (error) {
					console.error('Error building child message:', error);
					// Skip child messages we can't build
					continue;
				}
			}
		}
	} catch (error) {
		if (error instanceof Error && error.message.includes('403')) {
			// Skip messages we don't have access to
			console.warn(`Skipping message ${message_id} due to permission error`);
			return;
		}
		throw error; // Re-throw other errors
	}
}

export async function buildConversation(conversation_id: string): Promise<void> {
	const conversation_exists = conversation_store.getConversation(conversation_id);
	if (conversation_exists) return;

	try {
		const conversation = await conversation_api.getConversation(conversation_id);
		if (!conversation) {
			console.warn(`Conversation ${conversation_id} not found`);
			return;
		}

		// Initialize users_typing if not present
		conversation.users_typing = conversation.users_typing || new Set<string>();

		// Filter out any undefined or null message IDs
		conversation.messages = conversation.messages.filter(id => id != null);

		// Add conversation to store
		conversation_store.setConversation(conversation);

		// Build user for direct messages
		if (conversation.conversation_type === 'direct') {
			if (!conversation.user_id) {
				console.warn('Direct message conversation missing user_id');
				return;
			}
			try {
				await buildUser(conversation.user_id);
			} catch (error) {
				console.error('Error building user for direct message:', error);
				// Remove conversation from store since we couldn't build the user
				conversation_store.removeConversation(conversation_id);
				return;
			}
		}

		// Build messages
		if (conversation.messages && conversation.messages.length > 0) {
			const validMessages: string[] = [];
			for (const message_id of conversation.messages) {
				try {
					await buildMessage(message_id);
					// Only add root messages to the conversation's message list
					const message = message_store.getMessage(message_id);
					if (message && !message.parent_id) {
						validMessages.push(message_id);
					}
				} catch (error) {
					console.error('Error building message:', error);
					// Skip messages we can't build
					continue;
				}
			}
			// Update conversation with only valid root messages
			conversation.messages = validMessages;
			conversation_store.setConversation(conversation);
		}
	} catch (error) {
		if (error instanceof Error && error.message.includes('403')) {
			// Skip conversations we don't have access to
			console.warn(`Skipping conversation ${conversation_id} due to permission error`);
			return;
		}
		throw error; // Re-throw other errors
	}
}

// Update the buildChannel function
export async function buildChannel(channel_id: string): Promise<void> {
	console.log('Starting buildChannel for channel:', channel_id);

	const channel_exists = channel_store.getChannel(channel_id);
	if (channel_exists) {
		console.log('Channel already exists in store:', channel_exists);
		return;
	}

	try {
		// Get channel data
		const channel = await channel_api.getChannel(channel_id);
		if (!channel) {
			console.warn(`Channel ${channel_id} not found`);
			return;
		}

		// Add channel to store first
		channel_store.addChannel(channel);
		console.log('Added channel to store:', channel);

		// Add channel to workspace's channels set
		const workspace = workspace_store.getWorkspace(channel.workspace_id);
		if (workspace) {
			workspace.channels.add(channel.id);
			workspace_store.updateWorkspace(workspace.id, workspace);
		}

		// Build conversation if it exists
		if (channel.conversation_id) {
			try {
				await buildConversation(channel.conversation_id);
				// Add conversation to workspace's conversations set if workspace exists
				if (workspace) {
					workspace.conversations.add(channel.conversation_id);
					workspace_store.updateWorkspace(workspace.id, workspace);
				}
			} catch (error) {
				console.error('Error building conversation for channel:', channel_id);
				console.error('Conversation ID that failed:', channel.conversation_id);
				console.error('Error details:', error);
			}
		}
	} catch (error) {
		console.error('Error in buildChannel:', error);
		if (error instanceof Error && error.message.includes('403')) {
			console.warn(`Skipping channel ${channel_id} due to permission error`);
			return;
		}
		throw error;
	}
}

export async function buildDirectMessages(): Promise<void> {
	const direct_messages = await conversation_api.getDirectMessages();
	for (const dm of direct_messages) {
		await buildConversation(dm.id);
	}
}

export async function buildWorkspace(workspace_id: string): Promise<void> {
	console.log('Starting buildWorkspace for workspace:', workspace_id);

	let workspace = workspace_store.getWorkspace(workspace_id);
	if (!workspace) {
		try {
			// Get workspace data
			workspace = await workspace_api.getWorkspace({ id: workspace_id });
			if (!workspace) {
				throw new Error('Unable to get workspace.');
			}

			// Initialize empty Sets if they don't exist
			workspace.channels = new Set();
			workspace.conversations = new Set();
			workspace.members = new Set(Array.isArray(workspace.members) ? workspace.members : []);
			workspace.admins = new Set(Array.isArray(workspace.admins) ? workspace.admins : []);
			workspace.files = new Set(Array.isArray(workspace.files) ? workspace.files : []);

			// Add the workspace to the store before building channels
			workspace_store.addWorkspace(workspace);
		} catch (error) {
			console.error('Error getting workspace:', error);
			throw error;
		}
	}

	// Get all channels in the workspace
	try {
		const channels = await channel_api.getWorkspaceChannels(workspace_id);
		console.log('Retrieved channels:', channels);

		// Build each channel and its conversation
		for (const channel of channels) {
			if (!channel) continue;  // Skip if channel is null/undefined

			try {
				// Add channel to workspace's channels set
				workspace.channels.add(channel.id);

				// Add channel to store
				channel_store.addChannel(channel);

				// Build the channel's conversation
				if (channel.conversation_id) {
					try {
						await buildConversation(channel.conversation_id);
						// Add conversation to workspace's conversations set
						workspace.conversations.add(channel.conversation_id);
					} catch (error) {
						console.error(`Error building conversation for channel ${channel.id}:`, error);
					}
				}
			} catch (error) {
				console.error(`Error building channel ${channel.id}:`, error);
			}
		}

		// Update workspace with any new channels/conversations
		workspace_store.updateWorkspace(workspace.id, workspace);

		// Build members, admins, and files (with proper null checks)
		for (const member_id of Array.from(workspace.members)) {
			if (!member_id) continue;
			try {
				await buildUser(member_id);
			} catch (error) {
				console.error(`Error building member ${member_id}:`, error);
			}
		}

		for (const admin_id of Array.from(workspace.admins)) {
			if (!admin_id) continue;
			try {
				await buildUser(admin_id);
			} catch (error) {
				console.error(`Error building admin ${admin_id}:`, error);
			}
		}

		for (const file_id of Array.from(workspace.files)) {
			if (!file_id) continue;
			try {
				await buildFile(file_id);
			} catch (error) {
				console.error(`Error building file ${file_id}:`, error);
			}
		}

	} catch (error) {
		console.error('Error building workspace:', error);
		// If workspace fails to build completely, clean it up
		try {
			workspace_store.removeWorkspace(workspace_id);
		} catch (cleanupError) {
			console.error('Error cleaning up failed workspace build:', cleanupError);
		}
		throw error;
	}
}

export async function buildWorkspaces(): Promise<void> {
	const workspaces = await workspace_api.getWorkspaces();
	for (const workspace of workspaces) {
		await buildWorkspace(workspace.id);
	}
	await buildDirectMessages();
}

export function elementsInAButNotInB(a: Set<string>, b: Set<string>): Set<string> {
	return new Set([...a].filter((x) => !b.has(x)));
}

export function unionSet(a: Set<string>, b: Set<string>): Set<string> {
	return new Set([...a, ...b]);
}

export function unbuildFile(file_id: string): void {
	const file = file_store.getFile(file_id);
	if (!file) return;
	file_store.removeFile(file_id);
}

export function unbuildUser(user_id: string): void {
	const user = user_store.getUser(user_id);
	if (!user) return;
	if (user.s3_key) {
		unbuildFile(user.s3_key);
	}
	user_store.removeUser(user_id);
}

export function unbuildMessage(message_id: string): void {
	const message = message_store.getMessage(message_id);
	if (!message) return;
	if (message.children) {
		for (const child_id of message.children) {
			unbuildMessage(child_id);
		}
	}
	if (message.file_id) {
		unbuildFile(message.file_id);
	}
	message_store.removeMessage(message_id);
}

export function unbuildConversation(conversation_id: string): void {
	const conversation = conversation_store.getConversation(conversation_id);
	if (!conversation) return;
	for (const message_id of conversation.messages) {
		unbuildMessage(message_id);
	}
	conversation_store.removeConversation(conversation_id);
}

export function unbuildChannel(channel_id: string): void {
	const channel = channel_store.getChannel(channel_id);
	if (!channel) return;
	if (channel.conversation_id) {
		unbuildConversation(channel.conversation_id);
	}
	const workspace_id = channel.workspace_id;
	workspace_store.removeChannel(workspace_id, channel_id);
	channel_store.removeChannel(channel_id);
}

export function unbuildWorkspace(workspace_id: string): void {
	const workspace = workspace_store.getWorkspace(workspace_id);
	if (!workspace) return;
	for (const channel_id of workspace.channels) {
		unbuildChannel(channel_id);
	}
	let all_users: Set<string> = new Set();
	for (const workspace of workspace_store.getWorkspaces()) {
		if (workspace.id === workspace_id) continue;
		all_users = unionSet(all_users, workspace.members);
		all_users = unionSet(all_users, workspace.admins);
		all_users = unionSet(all_users, new Set([workspace.created_by_id]));
	}
	const direct_messages = conversation_store.getAllDirectMessages();
	for (const dm of direct_messages) {
		if (dm.user_id) {
			all_users.add(dm.user_id);
		}
	}
	const me = user_store.getMe();
	if (me) {
		all_users.add(me.id);
	}

	const orphan_users: Set<string> = new Set();
	for (const user_id of workspace.members) {
		orphan_users.add(user_id);
	}
	for (const user_id of workspace.admins) {
		orphan_users.add(user_id);
	}
	orphan_users.add(workspace.created_by_id);
	const orphan_users_to_remove = elementsInAButNotInB(orphan_users, all_users);
	for (const user_id of orphan_users_to_remove) {
		unbuildUser(user_id);
	}
	workspace_store.removeWorkspace(workspace_id);
}

export async function buildAll(): Promise<void> {
	user_store.setMe(await auth_api.getMe());
	await buildWorkspaces();
	await buildDirectMessages();
}

export function getTypingUsers(conversation_id: string) {
	const typingStatus = $derived(() => {
		const conversation = conversation_store.getConversation(conversation_id);
		if (!conversation) return '';

		const typing_users = conversation.users_typing;
		let youAreTyping = false;
		const typingUsers: string[] = [];

		for (const user_id of typing_users) {
			const user = user_store.getUser(user_id);
			if (!user) continue;
			if (user.id === user_store.getMe()?.id) {
				youAreTyping = true;
			} else {
				typingUsers.push(user.display_name || user.username || user.email || 'Someone');
			}
		}

		const totalTyping = typingUsers.length + (youAreTyping ? 1 : 0);

		switch (totalTyping) {
			case 0:
				return '';
			case 1:
				return youAreTyping ? 'You are typing...' : `${typingUsers[0]} is typing...`;
			case 2:
				return youAreTyping
					? `You and ${typingUsers[0]} are typing...`
					: `${typingUsers[0]} and ${typingUsers[1]} are typing...`;
			case 3:
				return youAreTyping
					? `You, ${typingUsers[0]}, and ${typingUsers[1]} are typing...`
					: `${typingUsers[0]}, ${typingUsers[1]}, and ${typingUsers[2]} are typing...`;
			default:
				const othersCount = typingUsers.length - 2;
				return youAreTyping
					? `You, ${typingUsers[0]}, ${typingUsers[1]}, and ${othersCount} others are typing...`
					: `${typingUsers[0]}, ${typingUsers[1]}, and ${othersCount + 1} others are typing...`;
		}
	});
	return typingStatus;
}

export function formatTime(date: string) {
	return new Date(date).toLocaleTimeString([], {
		hour: '2-digit',
		minute: '2-digit',
		hour12: true
	});
}

export function formatFileSize(bytes?: number): string {
	if (!bytes) return 'Unknown file size';
	const units = ['B', 'KB', 'MB', 'GB'];
	let size = bytes;
	let unitIndex = 0;

	while (size >= 1024 && unitIndex < units.length - 1) {
		size /= 1024;
		unitIndex++;
	}

	return `${size.toFixed(1)} ${units[unitIndex]}`;
}

export function decodeFileName(filename?: string) {
	if (!filename) {
		return 'File';
	}
	try {
		return decodeURIComponent(filename);
	} catch (error) {
		console.error('Error decoding filename:', error);
		return filename;
	}
}
