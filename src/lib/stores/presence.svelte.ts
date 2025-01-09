import { websocket } from './websocket.svelte';

interface UserPresence {
    id: string;
    isOnline: boolean;
    lastSeen: Date | null;
    isTyping: boolean;
}

class PresenceStore {
    userPresence = $state<Record<string, UserPresence>>({});
    typingTimeouts: Record<string, number> = {};

    constructor() {
        // Subscribe to websocket messages for presence updates
        websocket.socket?.addEventListener('message', (event: MessageEvent) => {
            const data = JSON.parse(event.data);

            if (data.type === 'presence_update') {
                this.updateUserPresence(
                    data.data.user_id,
                    data.data.is_online,
                    data.data.last_seen ? new Date(data.data.last_seen) : null
                );
            } else if (data.type === 'typing_update') {
                this.updateTypingStatus(data.data.user_id, data.data.conversation_id);
            }
        });
    }

    updateUserPresence(userId: string, isOnline: boolean, lastSeen: Date | null) {
        this.userPresence[userId] = {
            ...this.userPresence[userId],
            id: userId,
            isOnline,
            lastSeen,
            isTyping: this.userPresence[userId]?.isTyping || false
        };
    }

    updateTypingStatus(userId: string, conversationId: string) {
        // Clear existing timeout if any
        if (this.typingTimeouts[userId]) {
            clearTimeout(this.typingTimeouts[userId]);
        }

        // Update typing status
        this.userPresence[userId] = {
            ...this.userPresence[userId],
            id: userId,
            isTyping: true
        };

        // Set timeout to clear typing status after 3 seconds
        this.typingTimeouts[userId] = setTimeout(() => {
            if (this.userPresence[userId]) {
                this.userPresence[userId] = {
                    ...this.userPresence[userId],
                    isTyping: false
                };
            }
        }, 3000) as unknown as number;
    }

    // Send typing indicator to server
    async sendTypingIndicator(conversationId: string) {
        const ws = websocket.socket;
        if (!ws) return;

        ws.send(JSON.stringify({
            type: 'typing',
            data: {
                conversation_id: conversationId
            }
        }));
    }

    // Get presence info for a user
    getUserPresence(userId: string): UserPresence | null {
        return this.userPresence[userId] || null;
    }

    // Get typing users for a conversation
    getTypingUsers(conversationId: string, excludeUserId?: string): string[] {
        return Object.values(this.userPresence)
            .filter(p => p.isTyping && p.id !== excludeUserId)
            .map(p => p.id);
    }
}

export const presence = new PresenceStore(); 