import { websocketEvents } from './websocket-events';
import { setupWebSocketHandlers } from './websocket-handlers';

class WebSocketStore {
    socket: WebSocket | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectTimeout: number | null = null;
    private subscribedChannels = new Set<string>();
    private pendingSubscriptions = new Set<string>();
    private heartbeatInterval: number | null = null;
    private handlersSetup = false;

    constructor() {
        // Set up handlers immediately
        this.setupHandlers();

        // Subscribe to events that need to be sent to the server
        websocketEvents.subscribe('user_typing', (data) => {
            this.sendToServer('user_typing', data);
        });
    }

    private setupHandlers() {
        if (!this.handlersSetup) {
            console.log('Setting up WebSocket handlers...');
            setupWebSocketHandlers();
            this.handlersSetup = true;
        }
    }

    private sendToServer(type: string, data: any) {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            console.log('WebSocket not connected, cannot send:', type);
            return;
        }

        console.log('Sending to server:', type, data);
        this.socket.send(JSON.stringify({ type, data }));
    }

    connect() {
        if (this.socket?.readyState === WebSocket.OPEN) {
            console.log('WebSocket already connected');
            return;
        }

        try {
            // Ensure handlers are set up
            this.setupHandlers();

            console.log('Connecting to WebSocket...');
            this.socket = new WebSocket('ws://localhost:8000/ws');

            this.socket.onopen = () => {
                console.log('WebSocket connected');
                this.reconnectAttempts = 0;

                // Start heartbeat
                this.startHeartbeat();

                // Process any pending subscriptions first
                this.pendingSubscriptions.forEach(channelId => {
                    console.log('Processing pending subscription for channel:', channelId);
                    this.subscribeToChannel(channelId);
                });
                this.pendingSubscriptions.clear();

                // Then resubscribe to existing channels
                this.subscribedChannels.forEach(channelId => {
                    console.log('Resubscribing to channel:', channelId);
                    this.subscribeToChannel(channelId);
                });
            };

            this.socket.onclose = () => {
                console.log('WebSocket disconnected');
                this.handleReconnect();
            };

            this.socket.onerror = (error) => {
                console.error('WebSocket error:', error);
            };

            this.socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    console.log('WebSocket raw message received:', event.data);
                    console.log('WebSocket parsed message:', data);
                    console.log('WebSocket event type:', data.type);

                    // Dispatch the event to all subscribers
                    websocketEvents.dispatch(data.type, data.data);

                    // Handle subscription acknowledgments
                    if (data.type === 'ack') {
                        console.log('Received acknowledgment:', data.data);
                        if (data.data.received_type === 'subscribe') {
                            console.log('Successfully subscribed to channel');
                        }
                    }
                } catch (error) {
                    console.error('Error handling WebSocket message:', error);
                }
            };
        } catch (error) {
            console.error('Error connecting to WebSocket:', error);
            this.handleReconnect();
        }
    }

    private startHeartbeat() {
        this.stopHeartbeat();
        this.heartbeatInterval = setInterval(() => {
            if (this.socket?.readyState === WebSocket.OPEN) {
                console.log('Sending ping to server');
                this.sendToServer('ping', {});
            }
        }, 30000) as unknown as number;
    }

    private stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
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
            console.log('WebSocket not connected, queueing subscription for channel:', channelId);
            this.pendingSubscriptions.add(channelId);
            this.subscribedChannels.add(channelId);
            return;
        }

        if (this.subscribedChannels.has(channelId)) {
            console.log('Already subscribed to channel:', channelId);
            return;
        }

        console.log('Subscribing to channel:', channelId);
        this.subscribedChannels.add(channelId);
        this.sendToServer('subscribe', { channel_id: channelId });

        // Verify subscription after a delay
        setTimeout(() => {
            if (this.subscribedChannels.has(channelId)) {
                console.log('Verifying subscription to channel:', channelId);
                this.sendToServer('verify_subscription', { channel_id: channelId });
            }
        }, 2000);
    }

    unsubscribeFromChannel(channelId: string) {
        this.subscribedChannels.delete(channelId);
        this.pendingSubscriptions.delete(channelId);

        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            return;
        }

        this.sendToServer('unsubscribe', { channel_id: channelId });
    }

    disconnect() {
        this.stopHeartbeat();
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }

        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
    }
}

export const websocket = new WebSocketStore(); 