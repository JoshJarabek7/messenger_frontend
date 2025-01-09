import { writable } from "svelte/store";
import type { ChatType, User, Conversation } from "$lib/types";

interface LocalConversation extends Conversation {
    is_temporary?: boolean;
}

function createConversationsStore() {
    const { subscribe, set, update } = writable<{
        conversations: LocalConversation[];
        activeConversationId: string | null;
    }>({
        conversations: [],
        activeConversationId: null
    });

    return {
        subscribe,
        setActiveConversation: (conversationId: string) => {
            update(state => ({
                ...state,
                activeConversationId: conversationId
            }));
        },
        clearActiveConversation: () => {
            update(state => ({
                ...state,
                activeConversationId: null
            }));
        },
        addTemporaryConversation: (user: User) => {
            const tempId = `temp-${user.id}-${Date.now()}`;
            update(state => ({
                ...state,
                conversations: [
                    {
                        id: tempId,
                        conversation_type: 'DIRECT' as const,
                        participant_2: user,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                        is_temporary: true
                    },
                    ...state.conversations.filter(c => 
                        c.conversation_type !== 'DIRECT' || 
                        c.participant_2?.id !== user.id
                    )
                ]
            }));
        },
        removeTemporaryConversation: (userId: string) => {
            update(state => ({
                ...state,
                conversations: state.conversations.filter(
                    c => !(c.is_temporary && c.participant_2?.id === userId)
                )
            }));
        },
        loadConversations: async (workspaceId?: string) => {
            try {
                const url = workspaceId 
                    ? `http://localhost:8000/api/conversations/recent?workspace_id=${workspaceId}`
                    : 'http://localhost:8000/api/conversations/recent';
                
                const response = await fetch(url, {
                    credentials: 'include'
                });
                if (!response.ok) throw new Error('Failed to load conversations');
                const conversations = await response.json();
                update(state => ({
                    ...state,
                    conversations: conversations.map((c: any) => ({
                        ...c,
                        is_temporary: false
                    }))
                }));
            } catch (error) {
                console.error('Error loading conversations:', error);
                throw error;  // Re-throw to allow caller to handle the error
            }
        },
        updateConversation: (conversationId: string, updates: Partial<Conversation>) => {
            update(state => {
                const updatedConversations = state.conversations.map(c => {
                    if (c.id === conversationId || 
                        (c.is_temporary && c.participant_2?.id === updates.participant_2?.id)) {
                        return {
                            ...c,
                            ...updates,
                            is_temporary: false
                        };
                    }
                    return c;
                });

                // Move the updated conversation to the top if it has a new message
                if (updates.last_message) {
                    const updatedConversationIndex = updatedConversations.findIndex(c => 
                        c.id === conversationId || 
                        (c.is_temporary && c.participant_2?.id === updates.participant_2?.id)
                    );
                    if (updatedConversationIndex > 0) {
                        const [updatedConversation] = updatedConversations.splice(updatedConversationIndex, 1);
                        updatedConversations.unshift(updatedConversation);
                    }
                }

                return {
                    ...state,
                    conversations: updatedConversations
                };
            });
        }
    };
}

export const conversations = createConversationsStore();
