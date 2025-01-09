import { writable } from 'svelte/store';
import { auth } from './auth.svelte';
import { messages } from './messages.svelte';

class WebSocketStore {
    socket: WebSocket | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectTimeout: number | null = null;
    private subscribedChannels = new Set<string>();

    constructor() {
        // No automatic connection on construction
    }

    connect() {
        if (this.socket?.readyState === WebSocket.OPEN) {
            console.log('WebSocket already connected');
            return;
        }

        try {
            this.socket = new WebSocket('ws://localhost:8000/ws');

            this.socket.onopen = () => {
                console.log('WebSocket connected');
                this.reconnectAttempts = 0;

                // Resubscribe to channels
                this.subscribedChannels.forEach(channelId => {
                    this.subscribeToChannel(channelId);
                });
            };

            this.socket.onclose = () => {
                console.log('WebSocket disconnected');
                this.socket = null;
                this.handleReconnect();
            };

            this.socket.onerror = (error) => {
                console.error('WebSocket error:', error);
            };

            this.socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('Received WebSocket message:', data);

                    if (data.type === 'FILE_DELETED') {
                        const { file_id, message_id } = data.data;
                        messages.handleFileDeleted(file_id, message_id);
                    }
                } catch (error) {
                    console.error('Error parsing WebSocket message:', error);
                }
            };
        } catch (error) {
            console.error('Error connecting to WebSocket:', error);
            this.handleReconnect();
        }
    }

    private handleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.log('Max reconnection attempts reached');
            return;
        }

        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
        }

        this.reconnectTimeout = setTimeout(() => {
            this.reconnectAttempts++;
            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
            this.connect();
        }, Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000)) as unknown as number;
    }

    subscribeToChannel(channelId: string) {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            console.log('WebSocket not connected, adding channel to queue:', channelId);
            this.subscribedChannels.add(channelId);
            return;
        }

        console.log('Subscribing to channel:', channelId);
        this.subscribedChannels.add(channelId);
        this.socket.send(JSON.stringify({
            type: 'subscribe',
            data: {
                channel_id: channelId
            }
        }));
    }

    unsubscribeFromChannel(channelId: string) {
        this.subscribedChannels.delete(channelId);

        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            return;
        }

        this.socket.send(JSON.stringify({
            type: 'unsubscribe',
            data: {
                channel_id: channelId
            }
        }));
    }

    disconnect() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }

        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }

        this.reconnectAttempts = 0;
        this.subscribedChannels.clear();
    }
}

export const websocket = new WebSocketStore(); 