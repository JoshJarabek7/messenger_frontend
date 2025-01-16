import { conversation_store } from '$lib/stores/conversation.svelte';
import { message_store } from '$lib/stores/messages.svelte';
import type { IBuiltMessage, IReaction } from '$lib/types/messages.svelte';
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
import { auth_api } from './api/auth.svelte';
import { SvelteMap, SvelteSet } from 'svelte/reactivity';


export function getConversationMessages(conversation_id: string) {
	return () => {
		const conversation = conversation_store.getConversation(conversation_id);
		if (!conversation || !Array.isArray(conversation.messages)) {
			return [];
		}

		return conversation.messages
			.map((id) => {
				const message = message_store.getMessage(id);
				if (!message) return null;

				// Build child messages if this is a root message
				const thread_messages = !message.parent_id && message.children && message.children.length > 0
					? message.children
						.map((child_id) => {
							const child = message_store.getMessage(child_id);
							if (!child) return null;

							const built: IBuiltMessage = {
								id: child.id,
								user_id: child.user_id,
								content: child.content,
								file_id: child.file_id || undefined,
								reactions: child.reactions,
								children: [],
								parent_id: child.parent_id,
								created_at: child.created_at,
								updated_at: child.updated_at
							};
							return built;
						})
						.filter((msg): msg is IBuiltMessage => msg !== null)
					: [];

				const built: IBuiltMessage = {
					id: message.id,
					user_id: message.user_id,
					content: message.content,
					file_id: message.file_id || undefined,
					reactions: message.reactions,
					children: thread_messages,
					parent_id: message.parent_id,
					created_at: message.created_at,
					updated_at: message.updated_at
				};
				return built;
			})
			.filter((msg): msg is IBuiltMessage => msg !== null);
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
		const channels = Array.from(workspace.channels).map((id: string) => channel_store.getChannel(id));

		// Add logging for file processing
		const files = Array.from(workspace.files)
			.map((id) => {
				return file_store.getFile(id);
			})
			.filter(Boolean);

		return {
			members,
			admins,
			owner,
			user_count,
			name: workspace.name,
			description: workspace.description,
			image_s3_key: workspace.s3_key,
			files,
			channels
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
	if (!file_id) {
		console.error('Attempted to build file with empty ID');
		return;
	}

	// Clean up the file ID first
	let cleanId = file_id;
	if (file_id.startsWith('http')) {
		const parts = file_id.split('/');
		const lastPart = parts[parts.length - 1];
		const uuid = lastPart.split('?')[0];
		if (uuid) {
			let decoded = uuid;
			while (true) {
				const newDecoded = decodeURIComponent(decoded);
				if (newDecoded === decoded) {
					break;
				}
				decoded = newDecoded;
			}
			cleanId = decoded;
		}
	}



	// Early return if file already exists and has a blob
	const file_exists = file_store.getFile(cleanId);
	if (file_exists?.file_blob) {

		return;
	}

	try {
		// Get file info first
		const fileInfo = await file_api.getFileInfo(cleanId);
		if (!fileInfo) {
			throw new Error(`Unable to get file info for ${cleanId}`);
		}

		// Then get the blob
		const fileBlob = await file_api.getFileBlob(cleanId);
		if (!fileBlob) {
			throw new Error(`Unable to get file blob for ${cleanId}`);
		}

		// Store the complete file
		file_store.setFile({
			...fileInfo,  // Spread the file info
			file_blob: fileBlob
		});

	} catch (error) {
		console.error(`Error building file ${cleanId}:`, error);
		throw error;
	}
}

export async function buildUser(user_id: string): Promise<void> {
	const user_exists = user_store.getUser(user_id);
	const was_online = user_exists?.online || false;

	// Handle avatar file if it exists
	if (user_exists?.s3_key) {
		try {
			await buildFile(user_exists.s3_key);
		} catch (error) {
			console.error(`Error building avatar for user ${user_id}:`, error);
			// Continue even if avatar fails to load
		}
	}

	if (user_exists) return;

	const user = await user_api.getUser(user_id);
	if (!user) {
		throw new Error('Unable to get user.');
	}

	// Handle avatar file for newly fetched user
	if (user.s3_key) {
		try {
			await buildFile(user.s3_key);
		} catch (error) {
			console.error(`Error building avatar for new user ${user_id}:`, error);
			// Continue even if avatar fails to load
		}
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
		message.reactions = message.reactions || new SvelteMap();
		message.children = message.children || [];

		// Build user who sent the message first
		try {
			await buildUser(message.user_id);
		} catch (error) {
			console.error('Error building user for message:', error);
			// Remove message from store since we couldn't build the user
			message_store.removeMessage(message.id);
			return;
		}

		// Build users for all reactions
		if (message.reactions) {
			for (const [_, reaction] of Object.entries(message.reactions)) {
				try {
					await buildUser(reaction.user_id);
				} catch (error) {
					console.error(`Error building user ${reaction.user_id} for reaction:`, error);
					// Continue with other users even if one fails
				}
			}
		}

		// If this is a reply, ensure parent exists first
		if (message.parent_id) {
			const parentMessage = message_store.getMessage(message.parent_id);
			if (!parentMessage) {
				await buildMessage(message.parent_id);
			}
			// After ensuring parent exists, add this message to parent's children
			const parent = message_store.getMessage(message.parent_id);
			if (parent) {
				if (!parent.children) {
					parent.children = [];
				}
				if (!parent.children.includes(message.id)) {
					parent.children.push(message.id);
					message_store.addMessage(parent); // Update parent in store
				}
			}
		}

		// Build file if message has an attachment
		if (message.file_id) {
			try {
				await buildFile(message.file_id);
			} catch (error) {
				console.error('Error building file for message:', error);
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

	const channel_exists = channel_store.getChannel(channel_id);
	if (channel_exists) {
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
	let workspace = workspace_store.getWorkspace(workspace_id);
	if (!workspace) {
		try {
			// Add logging for initial API response
			const workspace_data = await workspace_api.getWorkspace({ id: workspace_id });

			if (!workspace_data) {
				throw new Error('Unable to get workspace.');
			}

			workspace = workspace_data;

			// Initialize empty Sets if they don't exist
			workspace.channels = new SvelteSet();
			workspace.conversations = new SvelteSet();

			// Log member data before conversion
			workspace.members = new SvelteSet(Array.isArray(workspace.members) ? workspace.members : []);
			workspace.admins = new SvelteSet(Array.isArray(workspace.admins) ? workspace.admins : []);
			workspace.files = new SvelteSet(Array.isArray(workspace.files) ? workspace.files : []);


			workspace_store.addWorkspace(workspace);

			// Verify the workspace was stored correctly
			const stored_workspace = workspace_store.getWorkspace(workspace_id);


		} catch (error) {
			console.error('Error getting workspace:', error);
			throw error;
		}
	}

	// Load workspace channels
	try {
		await channel_store.loadWorkspaceChannels(workspace_id);
		const channels = await channel_api.getWorkspaceChannels(workspace_id);
		channels.forEach(channel => {
			workspace?.channels.add(channel.id);
		});
		if (workspace) {
			workspace_store.updateWorkspace(workspace_id, workspace);
		}
	} catch (error) {
		console.error('Error loading workspace channels:', error);
	}


	for (const file_id of Array.from(workspace.files)) {
		if (!file_id) continue;
		try {
			await buildFile(file_id);
		} catch (error) {
			console.error(`Error building file ${file_id}:`, error);
		}
	}
}

export async function buildWorkspaces(): Promise<void> {
	const workspaces = await workspace_api.getWorkspaces();
	for (const workspace of workspaces) {
		await buildWorkspace(workspace.id);
	}
	await buildDirectMessages();
}

export function elementsInAButNotInB(a: SvelteSet<string>, b: SvelteSet<string>): SvelteSet<string> {
	return new SvelteSet([...a].filter((x) => !b.has(x)));
}

export function unionSet(a: SvelteSet<string>, b: SvelteSet<string>): SvelteSet<string> {
	return new SvelteSet([...a, ...b]);
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
	let all_users: SvelteSet<string> = new SvelteSet();
	for (const workspace of workspace_store.getWorkspaces()) {
		if (workspace.id === workspace_id) continue;
		all_users = unionSet(all_users, workspace.members);
		all_users = unionSet(all_users, workspace.admins);
		all_users = unionSet(all_users, new SvelteSet([workspace.created_by_id]));
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

	const orphan_users: SvelteSet<string> = new SvelteSet();
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

export function formatTime(date: string): string {
	const messageDate = new Date(date);
	// Adjust for local timezone
	const localDate = new Date(messageDate.getTime() - messageDate.getTimezoneOffset() * 60000);
	const now = new Date();
	const yesterday = new Date(now);
	yesterday.setDate(yesterday.getDate() - 1);

	// If message is from today
	if (localDate.toDateString() === now.toDateString()) {
		return localDate.toLocaleTimeString([], {
			hour: '2-digit',
			minute: '2-digit',
			hour12: true
		});
	}

	// If message is from yesterday
	if (localDate.toDateString() === yesterday.toDateString()) {
		return 'Yesterday at ' + localDate.toLocaleTimeString([], {
			hour: '2-digit',
			minute: '2-digit',
			hour12: true
		});
	}

	// If message is from this year
	if (localDate.getFullYear() === now.getFullYear()) {
		return localDate.toLocaleDateString([], {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			hour12: true
		});
	}

	// If message is from a different year
	return localDate.toLocaleDateString([], {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
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
