import type { User } from '$lib/types';
import { writable, type Subscriber, type Unsubscriber } from 'svelte/store';
import { websocketEvents } from './websocket-events';
import { auth } from './auth.svelte';
import { API_BASE_URL } from '$lib/config.ts';

class UsersStore {
    #users = $state<Record<string, User>>({});
    #subscribers = new Set<Subscriber<Record<string, User>>>();

    constructor() {
        // Subscribe to user events
        websocketEvents.subscribe('user_updated', (data) => {
            console.log('Received user update:', data);
            this.updateUser(data);
        });

        websocketEvents.subscribe('user_presence', (data) => {
            console.log('Received presence update:', data);
            if (data.user) {
                // Ensure we update the full user state with presence
                const currentUser = this.#users[data.user.id];
                this.updateUser({
                    ...(currentUser || {
                        id: data.user.id,
                        email: '',
                        username: data.user.username
                    }),  // Keep existing user data if we have it
                    ...data.user,  // Update with new user data
                    is_online: data.user.is_online  // Ensure presence is updated
                });
            }
        });
    }

    subscribe(run: Subscriber<Record<string, User>>): Unsubscriber {
        this.#subscribers.add(run);
        run(this.#users);

        return () => {
            this.#subscribers.delete(run);
        };
    }

    #notify() {
        for (const subscriber of this.#subscribers) {
            subscriber(this.#users);
        }
    }

    get state() {
        return this.#users;
    }

    async getUser(userId: string): Promise<User | null> {
        if (this.#users[userId]) {
            return this.#users[userId];
        }

        try {
            const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
                credentials: 'include'
            });

            if (!response.ok) {
                console.error('Failed to fetch user:', userId);
                return null;
            }

            const user = await response.json();
            // Initialize user with offline status unless we've received a presence update
            const currentUser = this.#users[userId];
            this.updateUser({
                ...user,
                is_online: currentUser?.is_online ?? false
            });
            return user;
        } catch (error) {
            console.error('Error fetching user:', error);
            return null;
        }
    }

    updateUser(user: User) {
        // Only update if the user data has actually changed
        const currentUser = this.#users[user.id];
        const newUser = {
            ...user,
            // Keep existing online status if not explicitly provided
            is_online: user.is_online ?? currentUser?.is_online ?? false
        };

        if (!currentUser || JSON.stringify(currentUser) !== JSON.stringify(newUser)) {
            console.log('Updating user in store:', newUser);
            this.#users[user.id] = newUser;
            this.#notify();
        }
    }

    updateUsers(users: User[]) {
        let hasChanges = false;
        users.forEach(user => {
            const currentUser = this.#users[user.id];
            const newUser = {
                ...user,
                // Keep existing online status if not explicitly provided
                is_online: user.is_online ?? currentUser?.is_online ?? false
            };

            if (!currentUser || JSON.stringify(currentUser) !== JSON.stringify(newUser)) {
                this.#users[user.id] = newUser;
                hasChanges = true;
            }
        });
        if (hasChanges) {
            this.#notify();
        }
    }

    isUserOnline(userId: string): boolean {
        return this.#users[userId]?.is_online ?? false;
    }

    getUserLastActive(userId: string): string | null {
        return this.#users[userId]?.last_active ?? null;
    }

    getOnlineUsers(): string[] {
        return Object.values(this.#users)
            .filter(user => user.is_online)
            .map(user => user.id);
    }

    clear() {
        this.#users = {};
        this.#notify();
    }
}

export const users = new UsersStore(); 