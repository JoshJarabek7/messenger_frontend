import { WS_BASE_URL } from '$lib/config';
import { MessageType } from '../types/message_types.svelte';
import { user_store } from '$lib/stores/user.svelte';

class WebSocketStore {
	static #instance: WebSocketStore;
	private ws!: WebSocket;
	private reconnectAttempts: number = 0;
	private maxReconnectAttempts: number = 5;
	private reconnectTimeout: number = 1000;
	private messageCallbacks: Set<(message: any) => void>;
	private isConnected: boolean = false;
	private isConnecting: boolean = false;
	private heartbeatInterval: number | null = null;
	private readonly HEARTBEAT_INTERVAL = 10000; // 10 seconds

	private constructor() {
		this.messageCallbacks = new Set();
		this.connect();
	}

	private startHeartbeat() {
		if (this.heartbeatInterval) {
			clearInterval(this.heartbeatInterval);
		}

		this.heartbeatInterval = setInterval(() => {
			if (this.isConnected) {
				try {
					const me = user_store.getMe();
					if (me) {
						this.send(JSON.stringify({
							message_type: MessageType.USER_ONLINE,
							user_id: me.id
						}));
					} else {
						console.warn('No user found for heartbeat');
					}
				} catch (error) {
					console.error('Error sending heartbeat:', error);
				}
			} else {
				console.warn('WebSocket not connected, skipping heartbeat');
			}
		}, this.HEARTBEAT_INTERVAL) as unknown as number;
	}

	private stopHeartbeat() {
		if (this.heartbeatInterval) {
			clearInterval(this.heartbeatInterval);
			this.heartbeatInterval = null;
		}
	}

	public updateOnlineStatus() {
		try {
			const me = user_store.getMe();
			if (me && this.isConnected) {
				// Set own status to online locally
				user_store.updateUser(me.id, { online: true });

				// Send online status to server
				this.send(JSON.stringify({
					message_type: MessageType.USER_ONLINE,
					user_id: me.id
				}));
			} else {
				console.warn('Cannot update online status:', !me ? 'No user found' : 'Not connected');
			}
		} catch (error) {
			console.warn('User not loaded yet, will update online status later');
		}
	}

	private setupEventHandlers() {
		this.ws.onclose = (event) => {
			this.isConnected = false;
			this.isConnecting = false;
			this.stopHeartbeat();
			if (this.reconnectAttempts < this.maxReconnectAttempts) {
				const delay = this.reconnectTimeout * Math.pow(2, this.reconnectAttempts);
				setTimeout(
					() => {
						if (!this.isConnecting && !this.isConnected) {
							this.reconnectAttempts++;
							this.connect();
						}
					},
					delay
				);
			}
		};

		this.ws.onmessage = (event) => {
			try {
				const data = JSON.parse(event.data);
				this.messageCallbacks.forEach((callback) => callback(data));
			} catch (error) {
				console.error('Error parsing WebSocket message:', error);
				console.error('Raw message data:', event.data);
			}
		};

		this.ws.onopen = () => {
			this.reconnectAttempts = 0;
			this.isConnected = true;
			this.isConnecting = false;
			this.updateOnlineStatus();
			this.startHeartbeat();
		};

		this.ws.onerror = (error) => {
			console.error('WebSocket error:', error);
			this.isConnecting = false;
		};
	}

	private connect() {
		if (this.isConnecting || this.isConnected) {
			return;
		}
		this.isConnecting = true;
		this.ws = new WebSocket(WS_BASE_URL);
		this.setupEventHandlers();
	}

	public cleanup() {
		this.stopHeartbeat();
		if (this.ws) {
			this.ws.close();
		}
		this.messageCallbacks.clear();
		this.isConnected = false;
		this.isConnecting = false;
	}

	static getInstance() {
		if (!WebSocketStore.#instance) {
			WebSocketStore.#instance = new WebSocketStore();
		}
		return WebSocketStore.#instance;
	}

	public send(data: any) {
		if (this.ws.readyState === WebSocket.OPEN) {
			this.ws.send(data);
		} else {
			console.warn('WebSocket not ready, message not sent:', data);
		}
	}

	public onMessage(callback: (message: any) => void) {
		this.messageCallbacks.add(callback);
	}

	public removeMessageListener(callback: (message: any) => void) {
		this.messageCallbacks.delete(callback);
	}
}

export const ws = WebSocketStore.getInstance();
