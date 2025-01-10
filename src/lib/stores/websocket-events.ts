type EventCallback = (data: any) => void;

class WebSocketEvents {
    private eventHandlers: Map<string, Set<EventCallback>> = new Map();
    private globalHandlers: Set<(type: string, data: any) => void> = new Set();

    subscribe(eventType: string, callback: EventCallback) {
        if (!this.eventHandlers.has(eventType)) {
            this.eventHandlers.set(eventType, new Set());
        }
        this.eventHandlers.get(eventType)?.add(callback);

        return () => {
            this.eventHandlers.get(eventType)?.delete(callback);
        };
    }

    subscribeToAll(callback: (type: string, data: any) => void) {
        this.globalHandlers.add(callback);
        return () => {
            this.globalHandlers.delete(callback);
        };
    }

    getHandlerCount(eventType: string): number {
        return this.eventHandlers.get(eventType)?.size || 0;
    }

    dispatch(eventType: string, data: any) {
        this.globalHandlers.forEach(handler => {
            try {
                handler(eventType, data);
            } catch (error) {
                console.error('Error in global event handler:', error);
            }
        });

        console.log('Dispatching event:', eventType, data);
        const handlers = this.eventHandlers.get(eventType);
        if (!handlers) {
            console.log('No handlers found for event type:', eventType);
            return;
        }
        console.log(`Found ${handlers.size} handlers for event type:`, eventType);
        handlers.forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error('Error in event handler:', error);
            }
        });
        console.log('Finished dispatching event:', eventType);
    }
}

export const websocketEvents = new WebSocketEvents(); 