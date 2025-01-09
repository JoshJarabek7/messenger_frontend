import { writable } from 'svelte/store';
import type { User, AuthResponse } from '$lib/types';

interface AuthState {
    user: User | null;
    isLoading: boolean;
}

function createAuthStore() {
    const initialState: AuthState = {
        user: null,
        isLoading: false
    };

    const { subscribe, set, update } = writable<AuthState>(initialState);

    // Keep a single reference to the current state
    let currentState = initialState;
    subscribe(state => {
        currentState = state;
    });

    return {
        subscribe,
        update,
        set,
        login: async (email: string, password: string): Promise<AuthResponse> => {
            if (currentState.isLoading) {
                throw new Error('Authentication in progress');
            }
            
            set({ ...currentState, isLoading: true });
            try {
                const response = await fetch('http://localhost:8000/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password }),
                    credentials: 'include'
                });

                if (!response.ok) {
                    throw new Error('Login failed');
                }

                const data: AuthResponse = await response.json();
                set({
                    user: data.user,
                    isLoading: false
                });
                return data;
            } catch (error) {
                set({ ...currentState, isLoading: false });
                throw error;
            }
        },

        register: async (userData: { email: string; username: string; password: string; display_name?: string }): Promise<AuthResponse> => {
            if (currentState.isLoading) {
                throw new Error('Authentication in progress');
            }
            
            set({ ...currentState, isLoading: true });
            try {
                const response = await fetch('http://localhost:8000/api/auth/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(userData),
                    credentials: 'include'
                });

                if (!response.ok) {
                    throw new Error('Registration failed');
                }

                const data: AuthResponse = await response.json();
                set({
                    user: data.user,
                    isLoading: false
                });
                return data;
            } catch (error) {
                set({ ...currentState, isLoading: false });
                throw error;
            }
        },

        logout: async () => {
            try {
                await fetch('http://localhost:8000/api/auth/logout', {
                    method: 'POST',
                    credentials: 'include'
                });
            } finally {
                set(initialState);
            }
        },

        verifyAuth: async (): Promise<AuthResponse | null> => {
            // If already loading or already have a user, don't verify again
            if (currentState.isLoading || currentState.user) return null;
            
            set({ ...currentState, isLoading: true });
            
            try {
                const response = await fetch('http://localhost:8000/api/auth/verify', {
                    credentials: 'include'
                });

                if (!response.ok) {
                    if (response.status === 401) {
                        set(initialState);
                        return null;
                    }
                    throw new Error('Auth verification failed');
                }

                const data: AuthResponse = await response.json();
                set({
                    user: data.user,
                    isLoading: false
                });
                return data;
            } catch (error) {
                set(initialState);
                throw error;
            }
        }
    };
}

export const auth = createAuthStore(); 