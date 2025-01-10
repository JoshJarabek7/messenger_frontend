import { websocketEvents } from './websocket-events';
import { setupWebSocketHandlers } from './websocket-handlers';
import { browser } from '$app/environment';

class WebSocketStore {
    socket: WebSocket | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectTimeout: number | null = null;
    private subscribedChannels = new Set<string>();
    private subscribedConversations = new Set<string>();
    private pendingSubscriptions = new Set<string>();
    private pendingConversations = new Set<string>();
    private heartbeatInterval: number | null = null;
    private handlersSetup = false;
    private isProcessingIncomingMessage = false;
    private unsubscribeHandlers: (() => void)[] = [];

    constructor() {
        // Set up handlers immediately
        this.setupHandlers();

        // Subscribe to events that need to be sent to the server
        const unsubscribe = websocketEvents.subscribe('user_typing', (data) => {
            // Only forward to server if this is not from an incoming message
            if (!this.isProcessingIncomingMessage) {
                this.sendToServer('user_typing', data);
            }
        });
        this.unsubscribeHandlers.push(unsubscribe);
    }

    private setupHandlers() {
        if (this.handlersSetup) {
            console.log('WebSocket handlers already set up');
            return;
        }

        console.log('Setting up WebSocket handlers...');
        setupWebSocketHandlers();
        this.handlersSetup = true;
    }

    private cleanup() {
        // Clean up all handlers
        this.unsubscribeHandlers.forEach(unsubscribe => unsubscribe());
        this.unsubscribeHandlers = [];
        websocketEvents.cleanup();
        this.handlersSetup = false;
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

                // Process any pending conversation subscriptions
                this.pendingConversations.forEach(conversationId => {
                    console.log('Processing pending subscription for conversation:', conversationId);
                    this.subscribeToConversation(conversationId);
                });
                this.pendingConversations.clear();

                // Then resubscribe to existing channels and conversations
                this.subscribedChannels.forEach(channelId => {
                    console.log('Resubscribing to channel:', channelId);
                    this.subscribeToChannel(channelId);
                });
                this.subscribedConversations.forEach(conversationId => {
                    console.log('Resubscribing to conversation:', conversationId);
                    this.subscribeToConversation(conversationId);
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

                    // Set flag to prevent forwarding incoming messages back to server
                    this.isProcessingIncomingMessage = true;
                    // Dispatch the event to all subscribers
                    websocketEvents.dispatch(data.type, data.data);
                    // Reset flag
                    this.isProcessingIncomingMessage = false;

                    // Handle subscription acknowledgments
                    if (data.type === 'ack') {
                        console.log('Received acknowledgment:', data.data);
                        if (data.data.received_type === 'subscribe') {
                            console.log('Successfully subscribed to channel');
                        }
                    }
                } catch (error) {
                    console.error('Error handling WebSocket message:', error);
                    this.isProcessingIncomingMessage = false;
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
    }

    unsubscribeFromChannel(channelId: string) {
        this.subscribedChannels.delete(channelId);
        this.pendingSubscriptions.delete(channelId);

        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            return;
        }

        this.sendToServer('unsubscribe', { channel_id: channelId });
    }

    subscribeToConversation(conversationId: string) {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            console.log('WebSocket not connected, queueing subscription for conversation:', conversationId);
            this.pendingConversations.add(conversationId);
            this.subscribedConversations.add(conversationId);
            return;
        }

        if (this.subscribedConversations.has(conversationId)) {
            console.log('Already subscribed to conversation:', conversationId);
            return;
        }

        console.log('Subscribing to conversation:', conversationId);
        this.subscribedConversations.add(conversationId);
        this.sendToServer('subscribe', { conversation_id: conversationId });
    }

    unsubscribeFromConversation(conversationId: string) {
        this.subscribedConversations.delete(conversationId);
        this.pendingConversations.delete(conversationId);

        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            return;
        }

        this.sendToServer('unsubscribe', { conversation_id: conversationId });
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

        // Clean up all handlers
        this.cleanup();
    }
}

export const websocket = new WebSocketStore(); 