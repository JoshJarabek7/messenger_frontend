import { writable } from 'svelte/store';
import type { User } from '$lib/types';
import { API_BASE_URL } from '$lib/config.ts';

interface AuthState {
    user: User | null;
    isLoading: boolean;
}

function createAuthStore() {
    const store = writable<AuthState>({
        user: null,
        isLoading: true
    });

    async function loadUser() {
        try {
            console.log('Loading user data...');
            const response = await fetch('${API_BASE_URL}/auth/verify', {
                credentials: 'include'
            });

            if (!response.ok) {
                console.error('Failed to load user:', await response.text());
                store.set({ user: null, isLoading: false });
                return;
            }

            const data = await response.json();
            console.log('Auth response:', data);
            store.set({ user: data, isLoading: false });
        } catch (error) {
            console.error('Error loading user:', error);
            store.set({ user: null, isLoading: false });
        }
    }

    return {
        subscribe: store.subscribe,
        loadUser,
        updateUser: (user: User) => {
            console.log('Updating user:', user);
            store.update(state => ({ ...state, user }));
        },
        login: async (email: string, password: string) => {
            try {
                const response = await fetch('${API_BASE_URL}/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password }),
                    credentials: 'include'
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.detail || 'Login failed');
                }

                const user = await response.json();
                store.update(state => ({ ...state, user }));
            } catch (error) {
                console.error('Login error:', error);
                throw error;
            }
        },
        logout: async () => {
            try {
                const response = await fetch('${API_BASE_URL}/auth/logout', {
                    method: 'POST',
                    credentials: 'include'
                });

                if (!response.ok) {
                    throw new Error('Logout failed');
                }

                store.set({ user: null, isLoading: false });
            } catch (error) {
                console.error('Error during logout:', error);
                throw error;
            }
        },
        register: async (userData: { email: string; username: string; password: string; display_name?: string }) => {
            try {
                const response = await fetch('${API_BASE_URL}/auth/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(userData),
                    credentials: 'include'
                });

                if (!response.ok) {
                    const error = await response.json();
                    throw new Error(error.detail || 'Registration failed');
                }

                const user = await response.json();
                store.update(state => ({ ...state, user }));
            } catch (error) {
                console.error('Registration error:', error);
                throw error;
            }
        }
    };
}

export const auth = createAuthStore(); 