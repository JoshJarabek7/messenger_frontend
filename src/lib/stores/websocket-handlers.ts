import { websocketEvents } from './websocket-events';
import { messages } from './messages.svelte';
import { users } from './users.svelte';
import { conversations } from './conversations.svelte';
import { workspace } from './workspace.svelte';
import { workspaces } from './workspaces.svelte';
import { websocket } from './websocket.svelte';
import type { Channel } from '$lib/types';
import type { WorkspaceState } from './workspace.svelte';
import { goto } from '$app/navigation';
import { API_BASE_URL } from '$lib/config.ts';

// Set up all WebSocket event handlers
export function setupWebSocketHandlers() {
    const cleanupFunctions: (() => void)[] = [];

    // Add a catch-all handler to log all events
    cleanupFunctions.push(
        websocketEvents.subscribeToAll((type, data) => {
            console.log('🔍 [WebSocket Event]', {
                type,
                data,
                timestamp: new Date().toISOString(),
                handlers: websocketEvents.getHandlerCount(type),
                isMessageEvent: type.includes('message'),
                dataKeys: Object.keys(data || {})
            });
        })
    );

    // Message events
    cleanupFunctions.push(
        websocketEvents.subscribe('message', (data) => {
            console.log('WebSocket: Received message event with data:', data);
            console.log('WebSocket: Adding message to messages store...');
            messages.addMessage(data);
            console.log('WebSocket: Updating conversation with message...');
            conversations.updateConversationWithMessage(data);
            console.log('WebSocket: Message handling complete');
        })
    );

    cleanupFunctions.push(
        websocketEvents.subscribe('message_sent', (data) => {
            console.log('WebSocket: Received message_sent event with data:', data);
            // Clear typing state for the user who sent the message
            if (data.user) {
                conversations.handleMessageSent(data.conversation_id, data.user.id);
            }

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
        })
    );

    cleanupFunctions.push(
        websocketEvents.subscribe('message_created', (data) => {
            console.log('Received new message:', data);
            messages.addMessage(data);
            conversations.updateConversationWithMessage(data);
        })
    );

    cleanupFunctions.push(
        websocketEvents.subscribe('message_updated', (data) => {
            console.log('Message updated:', data);
            messages.updateMessage(data);
            conversations.updateConversationWithMessage(data);
        })
    );

    cleanupFunctions.push(
        websocketEvents.subscribe('message_deleted', (data) => {
            console.log('Message deleted:', data);
            messages.updateMessage({ ...data, deleted: true });
            conversations.updateConversationWithMessage({ ...data, deleted: true });
        })
    );

    // Conversation events
    cleanupFunctions.push(
        websocketEvents.subscribe('conversation_created', (data) => {
            console.log('New conversation created:', data);
            // Add the conversation to the store
            conversations.addConversation(data);
            // Subscribe to the conversation channel
            websocket.subscribeToChannel(data.id);
        })
    );

    cleanupFunctions.push(
        websocketEvents.subscribe('conversation_updated', (data) => {
            console.log('Conversation updated:', data);
            conversations.updateConversation(data.id, data);
        })
    );

    cleanupFunctions.push(
        websocketEvents.subscribe('conversation_deleted', (data) => {
            console.log('Conversation deleted:', data);
            conversations.removeConversation(data.id);
            messages.clearMessagesForConversation(data.id);
            websocket.unsubscribeFromChannel(data.id);
        })
    );

    // Workspace events
    cleanupFunctions.push(
        websocketEvents.subscribe('workspace_updated', (data) => {
            console.log('Workspace updated:', data);
            workspaces.updateWorkspace(data.id, data);
        })
    );

    cleanupFunctions.push(
        websocketEvents.subscribe('workspace_deleted', (data) => {
            console.log('Workspace deleted:', data);
            // Remove workspace from stores
            workspaces.removeWorkspace(data.id);
            // If this was the active workspace, clear it
            if (workspace.state.activeWorkspace?.id === data.id) {
                workspace.setActiveWorkspace(null);
                // Navigate to dashboard
                goto('/dashboard');
            }
        })
    );

    cleanupFunctions.push(
        websocketEvents.subscribe('workspace_member_left', (data) => {
            console.log('🔍 Workspace member left event received:', {
                rawData: data,
                type: data.type,
                nestedData: data.data, // The backend might be nesting the data
                workspaceId: data.workspace_id || (data.data && data.data.workspace_id),
                userId: data.user_id || (data.data && data.data.user_id)
            });

            // Extract the correct data, handling potential nesting
            const eventData = data.data || data;
            const workspaceId = eventData.workspace_id;
            const userId = eventData.user_id;

            console.log('Processing member left with:', { workspaceId, userId });

            // Update workspaces store to decrement member count
            const existingWorkspace = workspaces.getWorkspace(workspaceId);
            if (existingWorkspace) {
                console.log('Updating workspace:', {
                    id: existingWorkspace.id,
                    currentMemberCount: existingWorkspace.member_count,
                    newMemberCount: Math.max(0, (existingWorkspace.member_count || 1) - 1)
                });

                workspaces.updateWorkspace(workspaceId, {
                    ...existingWorkspace,
                    member_count: Math.max(0, (existingWorkspace.member_count || 1) - 1)
                });
            } else {
                console.log('Workspace not found:', workspaceId);
            }

            // Update workspace store's member list
            if (workspace.state.activeWorkspace?.id === workspaceId) {
                console.log('Removing member from active workspace:', {
                    workspaceId,
                    userId,
                    currentMembers: workspace.state.members.length
                });
                // Remove the member from the current members list
                workspace.removeMember(workspaceId, userId);
            }
        })
    );

    cleanupFunctions.push(
        websocketEvents.subscribe('workspace_member_added', (data) => {
            console.log('🔍 Workspace member added event received:', {
                rawData: data,
                type: data.type,
                nestedData: data.data,
                workspaceId: data.workspace_id || (data.data && data.data.workspace_id),
                userId: data.user_id || (data.data && data.data.user_id),
                role: data.role || (data.data && data.data.role)
            });

            // Extract the correct data, handling potential nesting
            const eventData = data.data || data;
            const workspaceId = eventData.workspace_id;
            const userId = eventData.user_id;
            const role = eventData.role;
            const user = eventData.user;

            console.log('Processing member added with:', { workspaceId, userId, role, user });

            if (workspaceId && userId && role) {
                // Update the users store with the new user's data if we have it
                if (user) {
                    users.updateUser(user);
                }

                // Update the workspaces store to reflect the new member count
                const existingWorkspace = workspaces.getWorkspace(workspaceId);
                if (existingWorkspace) {
                    console.log('Updating workspace:', {
                        id: existingWorkspace.id,
                        currentMemberCount: existingWorkspace.member_count,
                        newMemberCount: (existingWorkspace.member_count || 0) + 1
                    });

                    workspaces.updateWorkspace(workspaceId, {
                        ...existingWorkspace,
                        member_count: (existingWorkspace.member_count || 0) + 1
                    });
                } else {
                    console.log('Workspace not found:', workspaceId);
                }

                // Update the workspace store's member list if this is the active workspace
                if (workspace.state.activeWorkspace?.id === workspaceId) {
                    console.log('Adding member to active workspace:', {
                        workspaceId,
                        userId,
                        role,
                        currentMembers: workspace.state.members.length
                    });

                    const newMember = user ? { ...user, role } : { id: userId, role };
                    workspace.addMember(workspaceId, newMember);
                }
            }
        })
    );

    // Channel events
    cleanupFunctions.push(
        websocketEvents.subscribe('channel_created', async (data) => {
            console.log('Channel created:', data);

            // Add to both stores
            workspace.addChannel(data);
            conversations.addConversation({
                ...data,
                conversation_type: 'PUBLIC',
                workspace_id: data.workspace_id,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });

            // Subscribe to the channel
            websocket.subscribeToChannel(data.id);

            // Ensure workspace members are loaded
            if (data.workspace_id && (!workspace.state.members || workspace.state.members.length === 0)) {
                try {
                    const response = await fetch(`${API_BASE_URL}/workspaces/${data.workspace_id}/members`, {
                        credentials: 'include'
                    });
                    if (response.ok) {
                        const members = await response.json();
                        workspace.setMembers(data.workspace_id, members);
                    }
                } catch (error) {
                    console.error('Error loading workspace members:', error);
                }
            }
        })
    );

    cleanupFunctions.push(
        websocketEvents.subscribe('channel_updated', (data) => {
            console.log('Channel updated:', data);
            workspace.updateChannel(data.id, data);
        })
    );

    cleanupFunctions.push(
        websocketEvents.subscribe('channel_deleted', (data) => {
            console.log('Channel deleted event received:', data);

            // Get initial state for logging
            const initialState = {
                channels: workspace.state.channels.map(c => c.id),
                activeChannel: workspace.state.activeChannel?.id,
                channelCount: workspace.state.channels.length,
                activeConversation: conversations.state.activeConversationId
            };

            console.log('Initial state before channel deletion:', initialState);

            // First unsubscribe from the channel's WebSocket events
            websocket.unsubscribeFromChannel(data.id);

            // Then clear messages for this channel
            messages.clearMessagesForConversation(data.id);

            // Then remove from conversations store first (this will clear active conversation if needed)
            conversations.removeConversation(data.id);

            // Then remove from workspace store to trigger UI updates
            // This will also clear the active channel if needed
            workspace.removeChannel(data.id);

            // Get final state for logging
            const finalState = {
                channels: workspace.state.channels.map(c => c.id),
                activeChannel: workspace.state.activeChannel?.id,
                channelCount: workspace.state.channels.length,
                activeConversation: conversations.state.activeConversationId
            };

            console.log('Final state after channel deletion:', finalState);
        })
    );

    // User events
    cleanupFunctions.push(
        websocketEvents.subscribe('user_updated', (data) => {
            console.log('Received user update:', data);
            users.updateUser(data);
            messages.updateUserInMessages(data);
            conversations.updateUserInConversations?.(data);
        })
    );

    // File events
    cleanupFunctions.push(
        websocketEvents.subscribe('file_deleted', (data) => {
            console.log('File deleted:', data);
            messages.handleFileDeleted(data.file_id, data.message_id);
        })
    );

    // Reaction events
    cleanupFunctions.push(
        websocketEvents.subscribe('reaction_sent', (data) => {
            console.log('Reaction sent:', data);
            messages.updateMessage(data);
        })
    );

    cleanupFunctions.push(
        websocketEvents.subscribe('reaction_deleted', (data) => {
            console.log('Reaction deleted:', data);
            messages.updateMessage(data);
        })
    );

    // Thread events
    cleanupFunctions.push(
        websocketEvents.subscribe('thread_reply', (data) => {
            console.log('Thread reply received:', data);

            // First add the reply message to the conversation
            // The messages store will handle duplicate checking internally
            messages.addMessage(data);

            // Then update the parent message's reply count and thread
            if (data.parent_id) {
                const parentMessage = messages.getMessageById(data.parent_id);
                if (parentMessage) {
                    // Only update if this reply isn't already in the parent's replies
                    const replyExists = parentMessage.replies?.some(reply => reply.id === data.id);
                    if (!replyExists) {
                        const updatedParentMessage = {
                            ...parentMessage,
                            reply_count: (parentMessage.reply_count || 0) + 1,
                            replies: [...(parentMessage.replies || []), data]
                        };
                        messages.updateMessage(updatedParentMessage);
                    }
                }
            }
        })
    );

    // Presence events
    cleanupFunctions.push(
        websocketEvents.subscribe('presence_update', (data) => {
            console.log('Presence update:', data);
            if (data.user) {
                users.updateUser({ ...data.user, is_online: data.is_online });
            }
        })
    );

    cleanupFunctions.push(
        websocketEvents.subscribe('user_typing', (data) => {
            console.log('Typing update:', data);
            if (data.user && data.is_typing) {
                conversations.setTyping(data.conversation_id, data.user);
            } else if (data.user && !data.is_typing) {
                conversations.clearTyping(data.conversation_id, data.user.id);
            }
        })
    );

    // Return a function that will clean up all handlers
    return () => {
        cleanupFunctions.forEach(cleanup => cleanup());
    };
} 