import type { Message, User } from '$lib/types';
import { users } from './users.svelte';
import { API_BASE_URL } from '$lib/config.ts';

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

    #subscribers = new Set<Subscriber<MessagesState>>();

    subscribe(run: Subscriber<MessagesState>): Unsubscriber {
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

    async loadMessagesForConversation(conversationId: string, page = 1, pageSize = 50, isChannel = false) {
        if (this.#state.messagesByConversation[conversationId]) {
            return this.#state.messagesByConversation[conversationId];
        }

        try {
            // For both channels and DMs, use the ID directly as the conversation ID
            const response = await fetch(
                `${API_BASE_URL}/messages/${conversationId}?limit=${pageSize}`,
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

        // Initialize array if it doesn't exist
        if (!this.#state.messagesByConversation[conversationId]) {
            this.#state.messagesByConversation[conversationId] = [];
        }

        // Check if message already exists
        const exists = this.#state.messagesByConversation[conversationId].some(m => m.id === message.id);
        if (!exists) {
            // If this is a reply, update the parent message first
            if (message.parent_id) {
                const parentMessage = this.getMessageById(message.parent_id);
                if (parentMessage) {
                    const updatedParentMessage = {
                        ...parentMessage,
                        reply_count: (parentMessage.reply_count || 0) + 1,
                        replies: [...(parentMessage.replies || []), message]
                    };
                    this.updateMessage(updatedParentMessage);
                }
            } else {
                // Only add non-reply messages to the main conversation list
                this.#state.messagesByConversation[conversationId] = [
                    ...this.#state.messagesByConversation[conversationId],
                    message
                ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            }

            // Update users store with message author
            if (message.user) {
                users.updateUser(message.user);
                this.#state.participants[message.user.id] = message.user;
            }
        }

        this.#notify();
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

    getMessageById(messageId: string): Message | null {
        // Search through all conversations for the message
        for (const messages of Object.values(this.#state.messagesByConversation)) {
            const message = messages.find(m => m.id === messageId);
            if (message) {
                return message;
            }
        }
        return null;
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

    async sendMessage(conversationId: string, content: string, fileIds?: string[]): Promise<Message> {
        try {
            const response = await fetch(`${API_BASE_URL}/messages/${conversationId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    content,
                    file_ids: fileIds
                }),
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error('Failed to send message');
            }

            const messageData = await response.json();
            this.addMessage(messageData);
            return messageData;
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    }

    clearMessagesForConversation(conversationId: string): void {
        // Remove all messages for the conversation
        const { [conversationId]: _, ...rest } = this.#state.messagesByConversation;
        this.#state.messagesByConversation = rest;
        this.#notify();
    }
}

export const messages = new MessagesStore(); 