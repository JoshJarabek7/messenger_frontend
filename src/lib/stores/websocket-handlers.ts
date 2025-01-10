import { websocketEvents } from './websocket-events';
import { messages } from './messages.svelte';
import { users } from './users.svelte';
import { conversations } from './conversations.svelte';
import { workspace } from './workspace.svelte';
import { workspaces } from './workspaces.svelte';
import { websocket } from './websocket.svelte';

// Set up all WebSocket event handlers
export function setupWebSocketHandlers() {
    // Add a catch-all handler to log all events
    websocketEvents.subscribeToAll((type, data) => {
        console.log('🔍 [WebSocket Event]', {
            type,
            data,
            timestamp: new Date().toISOString(),
            handlers: websocketEvents.getHandlerCount(type),
            isMessageEvent: type.includes('message'),
            dataKeys: Object.keys(data || {})
        });
    });

    // Message events
    websocketEvents.subscribe('message', (data) => {
        console.log('WebSocket: Received message event with data:', data);
        console.log('WebSocket: Adding message to messages store...');
        messages.addMessage(data);
        console.log('WebSocket: Updating conversation with message...');
        conversations.updateConversationWithMessage(data);
        console.log('WebSocket: Message handling complete');
    });

    websocketEvents.subscribe('message_sent', (data) => {
        console.log('WebSocket: Received message_sent event with data:', data);
        // Check if message exists in any conversation
        const messageExists = Object.values(messages.state.messagesByConversation).some(
            conversationMessages => conversationMessages.some(m => m.id === data.id)
        );

        if (messageExists) {
            console.log('WebSocket: Updating existing message...');
            messages.updateMessage(data);
        } else {
            console.log('WebSocket: Adding new message...');
            messages.addMessage(data);
        }

        console.log('WebSocket: Updating conversation with message...');
        conversations.updateConversationWithMessage(data);
        console.log('WebSocket: Message handling complete');
    });

    websocketEvents.subscribe('message_created', (data) => {
        console.log('Received new message:', data);
        messages.addMessage(data);
        conversations.updateConversationWithMessage(data);
    });

    websocketEvents.subscribe('message_updated', (data) => {
        console.log('Message updated:', data);
        messages.updateMessage(data);
        conversations.updateConversationWithMessage(data);
    });

    websocketEvents.subscribe('message_deleted', (data) => {
        console.log('Message deleted:', data);
        messages.updateMessage({ ...data, deleted: true });
        conversations.updateConversationWithMessage({ ...data, deleted: true });
    });

    // Conversation events
    websocketEvents.subscribe('conversation_created', (data) => {
        console.log('New conversation created:', data);
        conversations.updateConversation(data.id, data);
        websocket.subscribeToChannel(data.id);
    });

    websocketEvents.subscribe('conversation_updated', (data) => {
        console.log('Conversation updated:', data);
        conversations.updateConversation(data.id, data);
    });

    // Workspace events
    websocketEvents.subscribe('workspace_updated', (data) => {
        console.log('Workspace updated:', data);
        workspaces.updateWorkspace(data.id, data);
    });

    // Channel events
    websocketEvents.subscribe('channel_created', (data) => {
        console.log('Channel created:', data);
        workspace.addChannel(data);
    });

    websocketEvents.subscribe('channel_updated', (data) => {
        console.log('Channel updated:', data);
        workspace.updateChannel(data.id, data);
    });

    // User events
    websocketEvents.subscribe('user_updated', (data) => {
        console.log('Received user update:', data);
        users.updateUser(data);
        messages.updateUserInMessages(data);
        conversations.updateUserInConversations?.(data);
    });

    // File events
    websocketEvents.subscribe('file_deleted', (data) => {
        console.log('File deleted:', data);
        messages.handleFileDeleted(data.file_id, data.message_id);
    });

    // Reaction events
    websocketEvents.subscribe('reaction_sent', (data) => {
        console.log('Reaction sent:', data);
        messages.updateMessage(data);
    });

    websocketEvents.subscribe('reaction_deleted', (data) => {
        console.log('Reaction deleted:', data);
        messages.updateMessage(data);
    });

    // Thread events
    websocketEvents.subscribe('thread_reply', (data) => {
        console.log('Thread reply:', data);
        messages.updateMessage(data);
    });

    // Presence events
    websocketEvents.subscribe('presence_update', (data) => {
        console.log('Presence update:', data);
        if (data.user) {
            users.updateUser({ ...data.user, is_online: data.is_online });
        }
    });

    websocketEvents.subscribe('typing_update', (data) => {
        console.log('Typing update:', data);
        // This event is handled by the presence store
    });
} 