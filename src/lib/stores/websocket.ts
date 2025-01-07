import { writable } from 'svelte/store';
import { auth } from './auth.svelte';
import { get } from 'svelte/store';
import { conversations } from './conversations.svelte';

interface WebSocketMessage {
    type: string;
    data: any;
}

class WebSocketStore {
    public socket: WebSocket | null = null;
    private reconnectTimer: number | null = null;
    private pingInterval: number | null = null;
    private messageHandlers: Map<string, Set<(data: any) => void>> = new Map();

    constructor() {
        // Subscribe to auth changes to reconnect when token changes
        auth.subscribe(($auth) => {
            if ($auth.accessToken) {
                this.connect();
            } else {
                this.disconnect();
            }
        });
    }

    public connect() {
        if (this.socket?.readyState === WebSocket.OPEN) {
            console.log('WebSocket already connected');
            return;
        }
        // Close existing connection if any
        this.disconnect();

        // Create new WebSocket connection
        this.socket = new WebSocket(`ws://localhost:8000/ws`);

        this.socket.onopen = () => {
            console.log('WebSocket connected');
            // Start ping interval
            this.pingInterval = window.setInterval(() => {
                this.sendMessage(JSON.stringify({
                    type: 'ping',
                    data: {}
                }));
            }, 30000); // Send ping every 30 seconds
        };

        this.socket.onclose = () => {
            console.log('WebSocket disconnected');
            this.cleanup();
            // Try to reconnect after 5 seconds
            this.reconnectTimer = window.setTimeout(() => {
                this.connect();
            }, 5000);
        };

        this.socket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        this.socket.onmessage = (event) => {
            try {
                const message: WebSocketMessage = JSON.parse(event.data);
                console.log('WebSocket received message:', message);
                
                // Update conversations store for direct messages
                if (message.type === 'message_sent' && message.data.conversation_id) {
                    const lastMessage = {
                        content: message.data.content,
                        created_at: message.data.created_at
                    };
                    conversations.updateConversation(
                        message.data.conversation_id,
                        message.data.user.id,
                        lastMessage
                    );
                }

                // Notify all handlers for this message type
                const handlers = this.messageHandlers.get(message.type);
                if (handlers) {
                    handlers.forEach(handler => handler(message.data));
                }
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };
    }

    private cleanup() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
        this.cleanup();
    }

    sendMessage(message: string, channelId?: string) {
        if (this.socket?.readyState === WebSocket.OPEN) {
            this.socket.send(message);
        } else {
            console.warn('WebSocket is not connected');
        }
    }

    subscribeToChannel(channelId: string) {
        if (!channelId) {
            console.warn('No channel ID provided for subscription');
            return;
        }
        console.log('Subscribing to channel:', channelId);
        this.sendMessage(JSON.stringify({
            type: 'subscribe_channel',
            data: { channel_id: channelId }
        }));
    }

    unsubscribeFromChannel(channelId: string) {
        if (!channelId) {
            console.warn('No channel ID provided for unsubscription');
            return;
        }
        console.log('Unsubscribing from channel:', channelId);
        this.sendMessage(JSON.stringify({
            type: 'unsubscribe_channel',
            data: { channel_id: channelId }
        }));
    }

    onMessage(type: string, handler: (data: any) => void) {
        if (!this.messageHandlers.has(type)) {
            this.messageHandlers.set(type, new Set());
        }
        this.messageHandlers.get(type)?.add(handler);

        // Return unsubscribe function
        return () => {
            this.messageHandlers.get(type)?.delete(handler);
            if (this.messageHandlers.get(type)?.size === 0) {
                this.messageHandlers.delete(type);
            }
        };
    }
}

// Create and export singleton instance
export const websocket = new WebSocketStore(); 