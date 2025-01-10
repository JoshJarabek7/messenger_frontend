import type { User } from '$lib/types';
import { writable, type Subscriber, type Unsubscriber } from 'svelte/store';

class UsersStore {
    #users = $state<Record<string, User>>({});
    #subscribers = new Set<Subscriber<Record<string, User>>>();

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
            const response = await fetch(`http://localhost:8000/api/users/${userId}`, {
                credentials: 'include'
            });

            if (!response.ok) {
                console.error('Failed to fetch user:', userId);
                return null;
            }

            const user = await response.json();
            this.updateUser(user);
            return user;
        } catch (error) {
            console.error('Error fetching user:', error);
            return null;
        }
    }

    updateUser(user: User) {
        // Only update if the user data has actually changed
        const currentUser = this.#users[user.id];
        if (!currentUser || JSON.stringify(currentUser) !== JSON.stringify(user)) {
            console.log('Updating user in store:', user);
            this.#users[user.id] = user;
            this.#notify();
        }
    }

    updateUsers(users: User[]) {
        let hasChanges = false;
        users.forEach(user => {
            const currentUser = this.#users[user.id];
            if (!currentUser || JSON.stringify(currentUser) !== JSON.stringify(user)) {
                this.#users[user.id] = user;
                hasChanges = true;
            }
        });
        if (hasChanges) {
            this.#notify();
        }
    }

    clear() {
        this.#users = {};
        this.#notify();
    }
}

export const users = new UsersStore(); 