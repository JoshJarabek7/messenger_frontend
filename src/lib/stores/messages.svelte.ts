import { writable } from 'svelte/store';
import type { Message, FileAttachment } from '$lib/types';

interface MessagesState {
    messages: Record<string, Message[]>;  // conversationId -> messages
    isLoading: Record<string, boolean>;   // conversationId -> loading state
    error: Record<string, string | null>; // conversationId -> error message
}

function createMessagesStore() {
    const { subscribe, set, update } = writable<MessagesState>({
        messages: {},
        isLoading: {},
        error: {}
    });

    return {
        subscribe,
        loadMessages: async (conversationId: string) => {
            update(state => ({
                ...state,
                isLoading: { ...state.isLoading, [conversationId]: true },
                error: { ...state.error, [conversationId]: null }
            }));

            try {
                const response = await fetch(`http://localhost:8000/api/messages/${conversationId}`, {
                    credentials: 'include'
                });

                if (!response.ok) {
                    throw new Error('Failed to load messages');
                }

                const messages: Message[] = await response.json();
                update(state => ({
                    ...state,
                    messages: { ...state.messages, [conversationId]: messages },
                    isLoading: { ...state.isLoading, [conversationId]: false }
                }));
            } catch (error) {
                update(state => ({
                    ...state,
                    isLoading: { ...state.isLoading, [conversationId]: false },
                    error: { ...state.error, [conversationId]: error.message }
                }));
                throw error;
            }
        },

        sendMessage: async (conversationId: string, content: string, files?: File[]) => {
            try {
                const formData = new FormData();
                formData.append('content', content);
                
                if (files?.length) {
                    files.forEach(file => formData.append('files', file));
                }

                const response = await fetch(`http://localhost:8000/api/messages/${conversationId}`, {
                    method: 'POST',
                    credentials: 'include',
                    body: formData
                });

                if (!response.ok) {
                    throw new Error('Failed to send message');
                }

                const message: Message = await response.json();
                update(state => ({
                    ...state,
                    messages: {
                        ...state.messages,
                        [conversationId]: [...(state.messages[conversationId] || []), message]
                    }
                }));

                return message;
            } catch (error) {
                update(state => ({
                    ...state,
                    error: { ...state.error, [conversationId]: error.message }
                }));
                throw error;
            }
        },

        addMessage: (message: Message) => {
            update(state => ({
                ...state,
                messages: {
                    ...state.messages,
                    [message.conversation_id]: [
                        ...(state.messages[message.conversation_id] || []),
                        message
                    ]
                }
            }));
        },

        updateMessage: (message: Message) => {
            update(state => ({
                ...state,
                messages: {
                    ...state.messages,
                    [message.conversation_id]: state.messages[message.conversation_id]?.map(m =>
                        m.id === message.id ? message : m
                    ) || []
                }
            }));
        },

        deleteMessage: (messageId: string, conversationId: string) => {
            update(state => ({
                ...state,
                messages: {
                    ...state.messages,
                    [conversationId]: state.messages[conversationId]?.filter(m => m.id !== messageId) || []
                }
            }));
        },

        addReaction: async (messageId: string, emoji: string) => {
            try {
                const response = await fetch(`http://localhost:8000/api/messages/${messageId}/reactions`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ emoji }),
                    credentials: 'include'
                });

                if (!response.ok) {
                    throw new Error('Failed to add reaction');
                }

                const updatedMessage: Message = await response.json();
                update(state => ({
                    ...state,
                    messages: {
                        ...state.messages,
                        [updatedMessage.conversation_id]: state.messages[updatedMessage.conversation_id]?.map(m =>
                            m.id === updatedMessage.id ? updatedMessage : m
                        ) || []
                    }
                }));
            } catch (error) {
                console.error('Error adding reaction:', error);
                throw error;
            }
        },

        removeReaction: async (messageId: string, reactionId: string) => {
            try {
                const response = await fetch(`http://localhost:8000/api/messages/${messageId}/reactions/${reactionId}`, {
                    method: 'DELETE',
                    credentials: 'include'
                });

                if (!response.ok) {
                    throw new Error('Failed to remove reaction');
                }

                const updatedMessage: Message = await response.json();
                update(state => ({
                    ...state,
                    messages: {
                        ...state.messages,
                        [updatedMessage.conversation_id]: state.messages[updatedMessage.conversation_id]?.map(m =>
                            m.id === updatedMessage.id ? updatedMessage : m
                        ) || []
                    }
                }));
            } catch (error) {
                console.error('Error removing reaction:', error);
                throw error;
            }
        },

        clearMessages: (conversationId: string) => {
            update(state => ({
                ...state,
                messages: {
                    ...state.messages,
                    [conversationId]: []
                },
                error: {
                    ...state.error,
                    [conversationId]: null
                }
            }));
        }
    };
}

export const messages = createMessagesStore(); 