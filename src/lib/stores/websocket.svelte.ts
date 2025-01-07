import { auth } from './auth.svelte';
import { workspace } from './workspace.svelte';
import { LocalStorage } from '$lib/storage.svelte';

interface WebSocketState {
    isConnected: boolean;
    activeChannelId: string | null;
}

function createWebSocketStore() {
    let ws: WebSocket | null = null;
    let pingInterval: number | null = null;
    
    const storage = new LocalStorage<WebSocketState>('websocket', {
        isConnected: false,
        activeChannelId: null
    });

    const connect = () => {
        if (ws?.readyState === WebSocket.OPEN) return;

        const params = new URLSearchParams({
            token: auth.state.accessToken || '',
            ...(workspace.state.activeWorkspaceId && { workspace_id: workspace.state.activeWorkspaceId }),
            ...(storage.current.activeChannelId && { channel_id: storage.current.activeChannelId })
        });

        ws = new WebSocket(`ws://localhost:8000/api/ws?${params.toString()}`);

        ws.onopen = () => {
            storage.current.isConnected = true;
            console.log('WebSocket connected');
            
            // Start ping interval
            if (pingInterval) clearInterval(pingInterval);
            pingInterval = setInterval(() => {
                if (ws?.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'ping' }));
                }
            }, 30000); // Send ping every 30 seconds
        };

        ws.onclose = () => {
            storage.current.isConnected = false;
            if (pingInterval) clearInterval(pingInterval);
            console.log('WebSocket disconnected, attempting to reconnect...');
            setTimeout(connect, 5000); // Attempt to reconnect after 5 seconds
        };

        ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            storage.current.isConnected = false;
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                handleWebSocketMessage(data);
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };
    };

    const disconnect = () => {
        if (ws) {
            ws.close();
            ws = null;
        }
        if (pingInterval) {
            clearInterval(pingInterval);
            pingInterval = null;
        }
        storage.current.isConnected = false;
    };

    const handleWebSocketMessage = (message: any) => {
        switch (message.type) {
            case 'message_sent':
                // Handle new message
                // TODO: Update messages store
                break;
            
            case 'reaction_sent':
                // Handle new reaction
                // TODO: Update messages store
                break;
            
            case 'user_typing':
                // Handle typing indicator
                // TODO: Update UI to show typing indicator
                break;
            
            case 'user_presence':
                // Handle user presence update
                // TODO: Update UI to show user status
                break;
            
            case 'error':
                console.error('WebSocket error:', message.data.message);
                break;
        }
    };

    const setActiveChannel = (channelId: string | null) => {
        storage.current.activeChannelId = channelId;
        // Reconnect to update subscriptions
        disconnect();
        connect();
    };

    const sendMessage = (content: string, channelId: string, parentId?: string) => {
        if (ws?.readyState !== WebSocket.OPEN) return;
        
        ws.send(JSON.stringify({
            type: 'message_sent',
            data: {
                content,
                channel_id: channelId,
                parent_id: parentId
            }
        }));
    };

    const sendReaction = (messageId: string, emoji: string) => {
        if (ws?.readyState !== WebSocket.OPEN) return;
        
        ws.send(JSON.stringify({
            type: 'reaction_sent',
            data: {
                message_id: messageId,
                emoji
            }
        }));
    };

    const sendTyping = (channelId: string) => {
        if (ws?.readyState !== WebSocket.OPEN) return;
        
        ws.send(JSON.stringify({
            type: 'user_typing',
            data: {
                channel_id: channelId
            }
        }));
    };

    return {
        get state() {
            return storage.current;
        },
        connect,
        disconnect,
        setActiveChannel,
        sendMessage,
        sendReaction,
        sendTyping
    };
}

export const websocket = createWebSocketStore(); 