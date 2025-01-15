import { MessageType } from '$lib/types/message_types.svelte';
import { ws } from '$lib/stores/websocket.svelte';
import { channelCreated, channelDeleted, channelUpdated } from '$lib/subscribers/channel.svelte';
import {
	conversationCreated,
	directMessageConversationDeleted,
	userStoppedTyping,
	userTyping
} from '$lib/subscribers/conversation.svelte';
import { fileDeleted, fileUpdated } from '$lib/subscribers/file.svelte';
import { messageSent, reactionAdded, reactionRemoved } from '$lib/subscribers/message.svelte';
import { userOffline, userOnline, userUpdated } from '$lib/subscribers/user.svelte';
import {
	userJoinedWorkspace,
	userLeftWorkspace,
	workspaceDeleted,
	workspaceFileAdded,
	workspaceFileDeleted,
	workspaceUpdated
} from '$lib/subscribers/workspace.svelte';
import { workspaceRoleUpdated as workspaceRoleUpdatedSubscriber } from '$lib/subscribers/workspace_role.svelte';

interface WebSocketMessage {
	message_type: MessageType;
	[key: string]: any;
}

export function setupWebSocketHandlers() {
	ws.onMessage(async (message: WebSocketMessage) => {
		try {
			if (!message || !message.message_type) {
				console.error('Invalid message format:', message);
				return;
			}

			switch (message.message_type) {
				// User events
				case MessageType.USER_JOINED_WORKSPACE:
					if (!message.user_id || !message.role || !message.workspace_id) {
						console.error('Invalid USER_JOINED_WORKSPACE message:', message);
						return;
					}
					await userJoinedWorkspace(message.user_id, message.role, message.workspace_id);
					break;
				case MessageType.USER_LEFT_WORKSPACE:
					if (!message.user_id || !message.workspace_id) {
						console.error('Invalid USER_LEFT_WORKSPACE message:', message);
						return;
					}
					await userLeftWorkspace(message.user_id, message.workspace_id);
					break;
				case MessageType.USER_UPDATED:
					if (!message.user_id || !message.user) {
						console.error('Invalid USER_UPDATED message:', message);
						return;
					}
					await userUpdated(message.user_id, message.user);
					break;
				// In the WebSocket message handler
				case MessageType.USER_ONLINE:
					if (!message.user_id) {
						console.error('Invalid USER_ONLINE message:', message);
						return;
					}
					await userOnline(message.user_id);
					break;
				case MessageType.USER_OFFLINE:
					if (!message.user_id) {
						console.error('Invalid USER_OFFLINE message:', message);
						return;
					}
					await userOffline(message.user_id);
					break;
				case MessageType.USER_IS_TYPING:
					if (!message.conversation_id || !message.user_id) {
						console.error('Invalid USER_IS_TYPING message:', message);
						return;
					}
					await userTyping(message.conversation_id, message.user_id);
					break;
				case MessageType.USER_STOPPED_TYPING:
					if (!message.conversation_id || !message.user_id) {
						console.error('Invalid USER_STOPPED_TYPING message:', message);
						return;
					}
					await userStoppedTyping(message.conversation_id, message.user_id);
					break;

				// Conversation events
				case MessageType.CONVERSATION_CREATED:
					if (!message.conversation_id) {
						console.error('Invalid CONVERSATION_CREATED message:', message);
						return;
					}
					await conversationCreated(message.conversation_id);
					break;
				case MessageType.CONVERSATION_DELETED:
					if (!message.conversation_id) {
						console.error('Invalid CONVERSATION_DELETED message:', message);
						return;
					}
					await directMessageConversationDeleted(message.conversation_id);
					break;

				// Message events
				case MessageType.MESSAGE_SENT:
					if (!message.message_id) {
						console.error('Invalid MESSAGE_SENT message:', message);
						return;
					}
					await messageSent(message.message_id);
					break;

				// Channel events
				case MessageType.CHANNEL_CREATED:
					if (!message.channel_id || !message.channel) {
						console.error('Invalid CHANNEL_CREATED message:', message);
						return;
					}
					await channelCreated(message.channel_id, message.channel);
					break;
				case MessageType.CHANNEL_UPDATED:
					if (!message.channel_id || !message.updates) {
						console.error('Invalid CHANNEL_UPDATED message:', message);
						return;
					}
					await channelUpdated(message.channel_id, message.updates);
					break;
				case MessageType.CHANNEL_DELETED:
					if (!message.channel_id) {
						console.error('Invalid CHANNEL_DELETED message:', message);
						return;
					}
					await channelDeleted(message.channel_id);
					break;

				// Reaction events
				case MessageType.REACTION_ADDED:
					if (!message.message_id || !message.reaction) {
						console.error('Invalid REACTION_ADDED message:', message);
						return;
					}
					await reactionAdded(message.message_id, message.reaction);
					break;
				case MessageType.REACTION_REMOVED:
					if (!message.message_id || !message.reaction_id) {
						console.error('Invalid REACTION_REMOVED message:', message);
						return;
					}
					await reactionRemoved(message.message_id, message.reaction_id);
					break;

				// Workspace events
				case MessageType.WORKSPACE_UPDATED:
					if (!message.workspace_id || !message.workspace) {
						console.error('Invalid WORKSPACE_UPDATED message:', message);
						return;
					}
					await workspaceUpdated(message.workspace_id, message.workspace);
					break;
				case MessageType.WORKSPACE_DELETED:
					if (!message.workspace_id) {
						console.error('Invalid WORKSPACE_DELETED message:', message);
						return;
					}
					await workspaceDeleted(message.workspace_id);
					break;
				case MessageType.WORKSPACE_ROLE_UPDATED:
					if (!message.workspace_id || !message.user_id || !message.role) {
						console.error('Invalid WORKSPACE_ROLE_UPDATED message:', message);
						return;
					}
					await workspaceRoleUpdatedSubscriber(message.workspace_id, message.user_id, message.role);
					break;

				// File events
				case MessageType.FILE_UPDATED:
					if (!message.file_id || !message.updates) {
						console.error('Invalid FILE_UPDATED message:', message);
						return;
					}
					await fileUpdated(message.file_id);
					break;
				case MessageType.FILE_DELETED:
					if (!message.file_id) {
						console.error('Invalid FILE_DELETED message:', message);
						return;
					}
					await fileDeleted(message.file_id);
					break;
				case MessageType.WORKSPACE_FILE_ADDED:
					if (!message.workspace_id || !message.file_id) {
						console.error('Invalid WORKSPACE_FILE_ADDED message:', message);
						return;
					}
					await workspaceFileAdded(message.workspace_id, message.file_id);
					break;
				case MessageType.WORKSPACE_FILE_DELETED:
					if (!message.workspace_id || !message.file_id) {
						console.error('Invalid WORKSPACE_FILE_DELETED message:', message);
						return;
					}
					workspaceFileDeleted(message.workspace_id, message.file_id);
					break;
				default:
					console.warn('Unknown message type:', message.message_type);
			}
		} catch (error) {
			console.error('Error handling WebSocket message:', error);
			// You might want to add error reporting here
		}
	});
}
