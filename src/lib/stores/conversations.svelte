<script lang="ts" context="module">
    import { writable } from "svelte/store";

    type Conversation = {
        id?: string;  // Optional because temporary conversations won't have an ID
        user: {
            id: string;
            username: string;
            display_name?: string;
            avatar_url?: string;
        };
        last_message?: {
            content: string;
            created_at: string;
        };
        is_temporary?: boolean;
    };

    function createConversationsStore() {
        const { subscribe, set, update } = writable<{
            conversations: Conversation[];
            activeConversationUserId: string | null;
        }>({
            conversations: [],
            activeConversationUserId: null
        });

        return {
            subscribe,
            setActiveConversation: (userId: string) => {
                update(state => ({
                    ...state,
                    activeConversationUserId: userId
                }));
            },
            clearActiveConversation: () => {
                update(state => ({
                    ...state,
                    activeConversationUserId: null
                }));
            },
            addTemporaryConversation: (user: Conversation['user']) => {
                update(state => ({
                    ...state,
                    conversations: [
                        { user, is_temporary: true },
                        ...state.conversations.filter(c => c.user.id !== user.id)
                    ]
                }));
            },
            removeTemporaryConversation: (userId: string) => {
                update(state => ({
                    ...state,
                    conversations: state.conversations.filter(
                        c => !(c.is_temporary && c.user.id === userId)
                    )
                }));
            },
            loadConversations: async () => {
                try {
                    const response = await fetch('http://localhost:8000/api/conversations', {
                        credentials: 'include'
                    });
                    if (!response.ok) throw new Error('Failed to load conversations');
                    const conversations = await response.json();
                    update(state => ({
                        ...state,
                        conversations: conversations.filter((c: Conversation) => !c.is_temporary)
                    }));
                } catch (error) {
                    console.error('Error loading conversations:', error);
                }
            }
        };
    }

    export const conversations = createConversationsStore();
</script> 