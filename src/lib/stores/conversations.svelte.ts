import { writable, type Subscriber, type Unsubscriber } from 'svelte/store';
import type { Conversation, User, Message } from '$lib/types';
import { users } from './users.svelte';
import { websocketEvents } from './websocket-events';

interface WebSocketTypingEvent {
    user: User;
    conversation_id: string;
    is_typing: boolean;
}

interface ConversationsState {
    conversations: Conversation[];
    activeConversationId: string | null;
    error: string | null;
    isLoading: boolean;
    typingTimeouts: Record<string, Record<string, number>>;
    typingUsers: Record<string, Record<string, User>>;
}

class ConversationsStore {
    #state = $state<ConversationsState>({
        conversations: [],
        activeConversationId: null,
        error: null,
        isLoading: false,
        typingTimeouts: {},
        typingUsers: {}
    });

    #subscribers = new Set<Subscriber<ConversationsState>>();

    subscribe(run: Subscriber<ConversationsState>): Unsubscriber {
        this.#subscribers.add(run);
        run(this.#state);

        return () => {
            this.#subscribers.delete(run);
        };
    }

    #notify() {
        for (const subscriber of this.#subscribers) {
            subscriber(this.#state);
        }
    }

    get state() {
        return this.#state;
    }

    async loadConversations(): Promise<void> {
        this.#state.isLoading = true;
        this.#notify();

        try {
            const response = await fetch('http://localhost:8000/api/conversations/recent', {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to fetch conversations');
            }

            const conversations = await response.json();
            console.log('Loaded conversations:', conversations);

            // Update users store with participant data
            conversations.forEach((conv: Conversation) => {
                if (conv.participant_1) {
                    users.updateUser(conv.participant_1);
                }
                if (conv.participant_2) {
                    users.updateUser(conv.participant_2);
                }
            });

            // Set the conversations
            this.#state.conversations = conversations;
            this.#notify();
        } catch (error) {
            console.error('Error loading conversations:', error);
            this.#state.error = error instanceof Error ? error.message : 'Failed to load conversations';
        } finally {
            this.#state.isLoading = false;
            this.#notify();
        }
    }

    updateConversation(conversationId: string, conversation: Conversation): void {
        console.log('Updating conversation:', conversationId, conversation);

        // Update users store with participant data
        if (conversation.participant_1) users.updateUser(conversation.participant_1);
        if (conversation.participant_2) users.updateUser(conversation.participant_2);

        const index = this.#state.conversations.findIndex(c => c.id === conversationId);
        if (index !== -1) {
            this.#state.conversations[index] = conversation;
        } else {
            // For new conversations, add to the beginning of the list
            this.#state.conversations = [conversation, ...this.#state.conversations];
        }
        this.#notify();
    }

    updateConversationWithMessage(message: Message): void {
        console.log('Updating conversation with message:', message);
        const conversationId = message.conversation_id;
        const index = this.#state.conversations.findIndex(c => c.id === conversationId);

        if (index !== -1) {
            // Create a new conversation object with the updated message
            const updatedConversation = {
                ...this.#state.conversations[index],
                last_message: message,
                updated_at: message.created_at
            };

            // Remove the old conversation and add the updated one at the top
            this.#state.conversations = [
                updatedConversation,
                ...this.#state.conversations.slice(0, index),
                ...this.#state.conversations.slice(index + 1)
            ];

            console.log('Updated conversations:', this.#state.conversations);
            this.#notify();
        } else {
            // Only fetch conversation details for DMs
            const existingConversation = this.#state.conversations.find(c =>
                c.conversation_type === 'DIRECT' && c.id === conversationId
            );

            if (existingConversation) {
                // If it's a DM and we have it, update it
                this.updateConversation(conversationId, {
                    ...existingConversation,
                    last_message: message,
                    updated_at: message.created_at
                });
            }
            // For channels, we don't need to fetch the conversation since it's managed by the workspace store
        }
    }

    async fetchAndAddConversation(conversationId: string): Promise<void> {
        try {
            console.log('Fetching conversation:', conversationId);
            const response = await fetch(`http://localhost:8000/api/conversations/${conversationId}`, {
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to fetch conversation');
            }

            const conversation = await response.json();
            console.log('Fetched conversation:', conversation);

            // Update users store with participant data
            if (conversation.participant_1) {
                users.updateUser(conversation.participant_1);
            }
            if (conversation.participant_2) {
                users.updateUser(conversation.participant_2);
            }

            // Add the new conversation at the top of the list
            this.#state.conversations = [conversation, ...this.#state.conversations];
            console.log('Updated conversations after fetch:', this.#state.conversations);
            this.#notify();
        } catch (error) {
            console.error('Error fetching conversation:', error);
        }
    }

    setActiveConversation(userId: string | null): void {
        if (!userId) {
            this.#state.activeConversationId = null;
            this.#notify();
            return;
        }

        // Find existing conversation with this user
        const conversation = this.#state.conversations.find(
            c => (c.conversation_type === 'DIRECT' &&
                (c.participant_1?.id === userId || c.participant_2?.id === userId)) ||
                c.id === userId
        );

        if (conversation) {
            console.log('Found existing conversation:', conversation);
            this.#state.activeConversationId = conversation.id;
            this.#notify();
        } else {
            console.log('Creating temporary conversation for user:', userId);
            // Create a temporary conversation
            const tempConversation: Conversation = {
                id: userId, // Use userId as temporary ID
                conversation_type: 'DIRECT',
                participant_1: undefined, // Will be set by backend
                participant_2: undefined, // Will be set by backend
                is_temporary: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
            this.#state.conversations = [tempConversation, ...this.#state.conversations];
            this.#state.activeConversationId = userId;
            this.#notify();
        }
    }

    removeTemporaryConversation(userId: string): void {
        this.#state.conversations = this.#state.conversations.filter(c => !c.is_temporary || c.id !== userId);
        this.#notify();
    }

    clearActiveConversation(): void {
        this.#state.activeConversationId = null;
        this.#notify();
    }

    updateUserInConversations(updatedUser: User): void {
        this.#state.conversations = this.#state.conversations.map(conv => {
            if (conv.participant_1?.id === updatedUser.id) {
                return { ...conv, participant_1: updatedUser };
            }
            if (conv.participant_2?.id === updatedUser.id) {
                return { ...conv, participant_2: updatedUser };
            }
            return conv;
        });
        this.#notify();
    }

    addTemporaryConversation(user: User): void {
        console.log('Adding temporary conversation for user:', user);

        // Check if a conversation with this user already exists
        const existingConversation = this.#state.conversations.find(
            c => c.conversation_type === 'DIRECT' &&
                (c.participant_1?.id === user.id || c.participant_2?.id === user.id)
        );

        if (!existingConversation) {
            // Create a temporary conversation
            const tempConversation: Conversation = {
                id: user.id, // Use userId as temporary ID
                conversation_type: 'DIRECT',
                participant_1: undefined, // Will be set by backend
                participant_2: user, // Set the target user
                is_temporary: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            // Update users store with the user data
            users.updateUser(user);

            // Add to conversations and set as active
            this.#state.conversations = [tempConversation, ...this.#state.conversations];
            this.#state.activeConversationId = user.id;
            this.#notify();
        } else {
            console.log('Found existing conversation:', existingConversation);
            // If conversation exists, just set it as active
            this.#state.activeConversationId = existingConversation.id;
            this.#notify();
        }
    }

    setTyping(conversationId: string, user: User) {
        // Initialize maps if they don't exist
        if (!this.#state.typingTimeouts[conversationId]) {
            this.#state.typingTimeouts[conversationId] = {};
            this.#state.typingUsers[conversationId] = {};
        }

        // Clear existing timeout if any
        if (this.#state.typingTimeouts[conversationId][user.id]) {
            clearTimeout(this.#state.typingTimeouts[conversationId][user.id]);
        }

        // Add user to typing users
        this.#state.typingUsers[conversationId][user.id] = user;

        // Set new timeout
        this.#state.typingTimeouts[conversationId][user.id] = window.setTimeout(() => {
            this.clearTyping(conversationId, user.id);
        }, 5000);

        // Create new references to trigger reactivity
        this.#state.typingTimeouts = { ...this.#state.typingTimeouts };
        this.#state.typingUsers = { ...this.#state.typingUsers };
        this.#notify();
    }

    clearTyping(conversationId: string, userId: string) {
        if (this.#state.typingTimeouts[conversationId]?.[userId]) {
            clearTimeout(this.#state.typingTimeouts[conversationId][userId]);
            delete this.#state.typingTimeouts[conversationId][userId];
            delete this.#state.typingUsers[conversationId][userId];

            // Create new references to trigger reactivity
            this.#state.typingTimeouts = { ...this.#state.typingTimeouts };
            this.#state.typingUsers = { ...this.#state.typingUsers };
            this.#notify();
        }
    }

    getTypingUsers(conversationId: string): User[] {
        return Object.values(this.#state.typingUsers[conversationId] || {});
    }

    getTypingMessage(conversationId: string, currentUserId: string): string {
        const typingUsers = this.getTypingUsers(conversationId)
            .filter(user => user.id !== currentUserId);

        if (typingUsers.length === 0) return '';
        if (typingUsers.length === 1) return `${typingUsers[0].display_name} is typing...`;
        if (typingUsers.length === 2) return `${typingUsers[0].display_name} and ${typingUsers[1].display_name} are typing...`;
        if (typingUsers.length === 3) return `${typingUsers[0].display_name}, ${typingUsers[1].display_name}, and ${typingUsers[2].display_name} are typing...`;

        return `${typingUsers[0].display_name}, ${typingUsers[1].display_name}, and ${typingUsers.length - 2} others are typing...`;
    }

    handleMessageSent(conversationId: string, userId: string) {
        this.clearTyping(conversationId, userId);
    }

    // Send typing indicator to server
    async sendTypingIndicator(conversationId: string, isTyping: boolean) {
        websocketEvents.dispatch('user_typing', {
            conversation_id: conversationId,
            is_typing: isTyping
        });
    }

    constructor() {
        // Subscribe to typing events
        websocketEvents.subscribe('user_typing', (data: WebSocketTypingEvent) => {
            if (!data.user || !data.conversation_id) return;

            if (data.is_typing) {
                this.setTyping(data.conversation_id, data.user);
            } else {
                this.clearTyping(data.conversation_id, data.user.id);
            }
        });
    }
}

export const conversations = new ConversationsStore();
