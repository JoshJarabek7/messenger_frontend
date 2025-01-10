import type { Message, User } from '$lib/types';
import { users } from './users.svelte';

interface MessagesState {
    messagesByConversation: Record<string, Message[]>;
    isLoading: boolean;
    error: string | null;
    participants: Record<string, User>;
}

class MessagesStore {
    #state = $state<MessagesState>({
        messagesByConversation: {},
        isLoading: false,
        error: null,
        participants: {}
    });

    get state() {
        return this.#state;
    }

    async loadMessagesForConversation(conversationId: string, page = 1, pageSize = 50, isChannel = false) {
        if (this.#state.messagesByConversation[conversationId]) {
            return this.#state.messagesByConversation[conversationId];
        }

        try {
            // For both channels and DMs, use the ID directly as the conversation ID
            const response = await fetch(
                `http://localhost:8000/api/messages/${conversationId}?limit=${pageSize}`,
                {
                    credentials: 'include'
                }
            );

            if (response.status === 404) {
                // If conversation doesn't exist, just return empty array
                this.#state.messagesByConversation[conversationId] = [];
                return [];
            }

            if (!response.ok) {
                throw new Error('Failed to fetch messages');
            }

            const messages = await response.json();
            this.setMessagesForConversation(conversationId, messages);
            return messages;
        } catch (error) {
            console.error('Error loading messages for conversation', conversationId, ':', error);
            // Set empty array for failed conversation to prevent retrying
            this.#state.messagesByConversation[conversationId] = [];
            return [];
        }
    }

    setMessagesForConversation(conversationId: string, messages: Message[]) {
        // Sort messages by created_at in ascending order
        const sortedMessages = [...messages].sort((a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        // Filter out any duplicates
        const uniqueMessages = sortedMessages.filter(message =>
            !this.#state.messagesByConversation[conversationId]?.some(m => m.id === message.id)
        );

        // Update or set the messages
        if (this.#state.messagesByConversation[conversationId]) {
            this.#state.messagesByConversation[conversationId] = [
                ...this.#state.messagesByConversation[conversationId],
                ...uniqueMessages
            ];
        } else {
            this.#state.messagesByConversation[conversationId] = uniqueMessages;
        }

        // Update users store with message authors and update participants
        messages.forEach(message => {
            if (message.user) {
                users.updateUser(message.user);
                this.#state.participants[message.user.id] = message.user;
            }
        });
    }

    addMessage(message: Message) {
        const conversationId = message.conversation_id;
        if (!this.#state.messagesByConversation[conversationId]) {
            this.#state.messagesByConversation[conversationId] = [];
        }

        // Only add message if it doesn't exist
        if (!this.#state.messagesByConversation[conversationId].some(m => m.id === message.id)) {
            // Create a new array to trigger reactivity
            this.#state.messagesByConversation[conversationId] = [
                ...this.#state.messagesByConversation[conversationId],
                message
            ];

            // Sort messages by created_at
            this.#state.messagesByConversation[conversationId].sort((a, b) =>
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );

            // Update users store with message author and update participants
            if (message.user) {
                users.updateUser(message.user);
                this.#state.participants[message.user.id] = message.user;
            }

            // Create a new messagesByConversation object to ensure reactivity
            this.#state.messagesByConversation = { ...this.#state.messagesByConversation };
        }
    }

    updateMessage(message: Message) {
        const conversationId = message.conversation_id;
        if (!this.#state.messagesByConversation[conversationId]) return;

        const index = this.#state.messagesByConversation[conversationId].findIndex(m => m.id === message.id);
        if (index !== -1) {
            // Create a new array for the conversation to trigger reactivity
            this.#state.messagesByConversation[conversationId] = [
                ...this.#state.messagesByConversation[conversationId].slice(0, index),
                message,
                ...this.#state.messagesByConversation[conversationId].slice(index + 1)
            ];
            // Create a new messagesByConversation object to ensure reactivity
            this.#state.messagesByConversation = { ...this.#state.messagesByConversation };
        }

        // Update users store with message author and update participants
        if (message.user) {
            users.updateUser(message.user);
            this.#state.participants[message.user.id] = message.user;
        }
    }

    handleFileDeleted(fileId: string, messageId: string) {
        // Find message in all conversations
        Object.keys(this.#state.messagesByConversation).forEach(conversationId => {
            const message = this.#state.messagesByConversation[conversationId].find(m => m.id === messageId);
            if (message && message.attachments) {
                message.attachments = message.attachments.filter(a => a.id !== fileId);
                this.updateMessage(message);
            }
        });
    }

    getMessagesForConversation(conversationId: string): Message[] {
        return this.#state.messagesByConversation[conversationId] || [];
    }

    clear() {
        this.#state.messagesByConversation = {};
        this.#state.error = null;
    }

    updateUserInMessages(updatedUser: User) {
        console.log('Updating user in messages:', updatedUser);
        let hasUpdates = false;

        // Create a new messagesByConversation object
        const updatedMessagesByConversation = Object.fromEntries(
            Object.entries(this.#state.messagesByConversation).map(([conversationId, messages]) => {
                // Create a new messages array only if we need to update a message
                const updatedMessages = messages.map(message => {
                    if (message.user.id === updatedUser.id) {
                        console.log('Updating message:', message.id, 'in conversation:', conversationId);
                        hasUpdates = true;
                        return {
                            ...message,
                            user: { ...updatedUser }
                        };
                    }
                    return message;
                });

                return [conversationId, updatedMessages];
            })
        );

        if (hasUpdates) {
            console.log('Applying message updates to state');
            this.#state.messagesByConversation = updatedMessagesByConversation;
        }
    }
}

export const messages = new MessagesStore(); 