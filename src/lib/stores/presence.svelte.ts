import { websocketEvents } from './websocket-events';

interface UserPresence {
    id: string;
    isOnline: boolean;
    lastSeen: Date | null;
}

class PresenceStore {
    userPresence = $state<Record<string, UserPresence>>({});

    constructor() {
        // Subscribe to presence events
        websocketEvents.subscribe('presence_update', (data) => {
            this.updateUserPresence(
                data.user_id,
                data.is_online,
                data.last_seen ? new Date(data.last_seen) : null
            );
        });
    }

    updateUserPresence(userId: string, isOnline: boolean, lastSeen: Date | null) {
        this.userPresence[userId] = {
            id: userId,
            isOnline,
            lastSeen
        };
    }

    // Get presence info for a user
    getUserPresence(userId: string): UserPresence | null {
        return this.userPresence[userId] || null;
    }
}

export const presence = new PresenceStore(); 