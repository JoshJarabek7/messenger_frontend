import { writable, derived } from 'svelte/store';

interface User {
    id: string;
    email: string;
    username: string;
    display_name?: string;
    avatar_url?: string;
}

interface AuthState {
    user: User | null;
    accessToken: string | null;
    isLoading: boolean;
}

function createAuthStore() {
    const initialState: AuthState = {
        user: null,
        accessToken: null,
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
        login: async (email: string, password: string) => {
            if (currentState.isLoading) return;
            
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

                const data = await response.json();
                set({
                    user: data.user,
                    accessToken: data.access_token,
                    isLoading: false
                });
                return data;
            } catch (error) {
                set({ ...currentState, isLoading: false });
                throw error;
            }
        },

        register: async (userData: { email: string; username: string; password: string; display_name?: string }) => {
            if (currentState.isLoading) return;
            
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

                const data = await response.json();
                set({
                    user: data.user,
                    accessToken: data.access_token,
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
                set({
                    user: null,
                    accessToken: null,
                    isLoading: false
                });
            }
        },

        refreshToken: async () => {
            try {
                const response = await fetch('http://localhost:8000/api/auth/refresh', {
                    method: 'POST',
                    credentials: 'include'
                });

                if (!response.ok) {
                    throw new Error('Token refresh failed');
                }

                const data = await response.json();
                set({
                    ...currentState,
                    accessToken: data.access_token
                });
                return data;
            } catch (error) {
                set({
                    user: null,
                    accessToken: null,
                    isLoading: false
                });
                throw error;
            }
        },

        verifyAuth: async () => {
            // If already loading or already have a user, don't verify again
            if (currentState.isLoading || currentState.user) return;
            
            set({ ...currentState, isLoading: true });
            
            try {
                const response = await fetch('http://localhost:8000/api/auth/verify', {
                    credentials: 'include'
                });

                if (!response.ok) {
                    if (response.status === 401) {
                        set({
                            user: null,
                            accessToken: null,
                            isLoading: false
                        });
                        return null;
                    }
                    throw new Error('Auth verification failed');
                }

                const data = await response.json();
                set({
                    user: data.user,
                    accessToken: data.accessToken,
                    isLoading: false
                });
                return data;
            } catch (error) {
                set({
                    user: null,
                    accessToken: null,
                    isLoading: false
                });
                throw error;
            }
        }
    };
}

export const auth = createAuthStore(); 