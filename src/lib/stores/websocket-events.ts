type EventCallback = (data: any) => void;

class WebSocketEvents {
    private eventHandlers: Map<string, Set<EventCallback>> = new Map();
    private globalHandlers: Set<(type: string, data: any) => void> = new Set();

    subscribe(eventType: string, callback: EventCallback) {
        if (!this.eventHandlers.has(eventType)) {
            this.eventHandlers.set(eventType, new Set());
        }
        const handlers = this.eventHandlers.get(eventType)!;

        handlers.forEach(existingCallback => {
            if (existingCallback.toString() === callback.toString()) {
                handlers.delete(existingCallback);
            }
        });

        handlers.add(callback);

        return () => {
            this.eventHandlers.get(eventType)?.delete(callback);
            if (this.eventHandlers.get(eventType)?.size === 0) {
                this.eventHandlers.delete(eventType);
            }
        };
    }

    subscribeToAll(callback: (type: string, data: any) => void) {
        this.globalHandlers.forEach(existingCallback => {
            if (existingCallback.toString() === callback.toString()) {
                this.globalHandlers.delete(existingCallback);
            }
        });

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

    cleanup() {
        this.eventHandlers.clear();
        this.globalHandlers.clear();
    }
}

export const websocketEvents = new WebSocketEvents(); 