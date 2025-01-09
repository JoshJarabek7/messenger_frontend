import type { Message } from '$lib/types';

interface MessagesState {
    messages: Message[];
    participants: Record<string, {
        id: string;
        username: string;
        display_name?: string;
        avatar_url?: string;
        is_online: boolean;
    }>;
    isLoading: boolean;
    error: string | null;
}

class MessagesStore {
    #state = $state<MessagesState>({
        messages: [],
        participants: {},
        isLoading: false,
        error: null
    });

    get state() {
        return this.#state;
    }

    setMessages(messages: Message[]) {
        console.log('Setting messages:', messages);
        this.#state.messages = messages;

        // Update participants
        const participants: Record<string, any> = {};
        messages.forEach(message => {
            if (message.user) {
                participants[message.user.id] = {
                    id: message.user.id,
                    username: message.user.username,
                    display_name: message.user.display_name,
                    avatar_url: message.user.avatar_url,
                    is_online: message.user.is_online
                };
            }
        });
        this.#state.participants = participants;
    }

    addMessage(message: Message) {
        console.log('Adding message:', message);
        this.#state.messages = [...this.#state.messages, message];

        // Add participant
        if (message.user) {
            this.#state.participants[message.user.id] = {
                id: message.user.id,
                username: message.user.username,
                display_name: message.user.display_name,
                avatar_url: message.user.avatar_url,
                is_online: message.user.is_online
            };
        }
    }

    updateMessage(message: Message) {
        console.log('Updating message:', message);
        const index = this.#state.messages.findIndex(m => m.id === message.id);
        if (index !== -1) {
            this.#state.messages[index] = message;
        }

        // Update participant
        if (message.user) {
            this.#state.participants[message.user.id] = {
                id: message.user.id,
                username: message.user.username,
                display_name: message.user.display_name,
                avatar_url: message.user.avatar_url,
                is_online: message.user.is_online
            };
        }
    }

    clear() {
        console.log('Clearing messages');
        this.#state.messages = [];
        this.#state.participants = {};
        this.#state.error = null;
    }
}

export const messages = new MessagesStore(); 