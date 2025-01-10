import { websocketEvents } from './websocket-events';

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
        // Subscribe to presence events
        websocketEvents.subscribe('presence_update', (data) => {
            this.updateUserPresence(
                data.user_id,
                data.is_online,
                data.last_seen ? new Date(data.last_seen) : null
            );
        });

        websocketEvents.subscribe('typing_update', (data) => {
            this.updateTypingStatus(data.user_id, data.conversation_id);
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
        websocketEvents.dispatch('typing', {
            conversation_id: conversationId
        });
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