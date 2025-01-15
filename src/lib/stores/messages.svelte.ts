import type { IMessage, IReaction } from '$lib/types/messages.svelte';

export class MessageStore {
	static #instance: MessageStore;
	private messages = $state<Record<string, IMessage>>({});

	private constructor() { }

	public static getInstance(): MessageStore {
		if (!MessageStore.#instance) {
			MessageStore.#instance = new MessageStore();
		}
		return MessageStore.#instance;
	}

	public getMessage(message_id: string): IMessage {
		return this.messages[message_id];
	}

	public addMessage(message: IMessage): void {
		console.log('========== ADDING MESSAGE TO STORE ==========');
		console.log('Message to add:', message);
		// Initialize children array if not present
		const messageToAdd = { ...message, children: message.children || [], reactions: message.reactions || new Set() };
		console.log('Message after initialization:', messageToAdd);

		// If this is a reply, add it to the parent's children
		if (messageToAdd.parent_id) {
			console.log(`Message ${messageToAdd.id} is a child of ${messageToAdd.parent_id}`);
			const parentMessage = this.messages[messageToAdd.parent_id];
			if (parentMessage) {
				console.log('Found parent message:', parentMessage);
				// Create a new Set to ensure uniqueness
				const childrenSet = new Set([...parentMessage.children || [], messageToAdd.id]);
				console.log('Updated children set:', childrenSet);
				this.messages = {
					...this.messages,
					[messageToAdd.parent_id]: {
						...parentMessage,
						children: Array.from(childrenSet)
					}
				};
				console.log('Updated parent message:', this.messages[messageToAdd.parent_id]);
			} else {
				console.log('Parent message not found in store');
			}
		} else {
			console.log(`Message ${messageToAdd.id} is a root message`);
		}

		// Add/update the message itself
		this.messages = {
			...this.messages,
			[messageToAdd.id]: messageToAdd
		};
		console.log('Current messages in store:', this.messages);
		console.log('========== END ADDING MESSAGE TO STORE ==========');
	}

	public updateMessage(message_id: string, updates: Partial<IMessage>): void {
		if (this.messages[message_id]) {
			const updatedMessage = { ...this.messages[message_id], ...updates };

			// If parent_id is being updated, handle the parent-child relationship
			if (updates.parent_id !== undefined) {
				// Remove from old parent if exists
				const oldParentId = this.messages[message_id].parent_id;
				if (oldParentId && this.messages[oldParentId]) {
					this.messages[oldParentId] = {
						...this.messages[oldParentId],
						children: (this.messages[oldParentId].children || []).filter(id => id !== message_id)
					};
				}

				// Add to new parent if exists
				if (updates.parent_id && this.messages[updates.parent_id]) {
					const newChildren = new Set([
						...this.messages[updates.parent_id].children || [],
						message_id
					]);
					this.messages[updates.parent_id] = {
						...this.messages[updates.parent_id],
						children: Array.from(newChildren)
					};
				}
			}

			this.messages[message_id] = updatedMessage;
		}
	}

	public removeMessage(message_id: string): void {
		const messageToRemove = this.messages[message_id];
		if (!messageToRemove) return;

		// Remove from parent's children if it's a reply
		if (messageToRemove.parent_id && this.messages[messageToRemove.parent_id]) {
			this.messages[messageToRemove.parent_id] = {
				...this.messages[messageToRemove.parent_id],
				children: (this.messages[messageToRemove.parent_id].children || []).filter(
					id => id !== message_id
				)
			};
		}

		// Remove all child messages recursively
		if (messageToRemove.children) {
			messageToRemove.children.forEach(childId => this.removeMessage(childId));
		}

		// Remove the message itself
		const newMessages = { ...this.messages };
		delete newMessages[message_id];
		this.messages = newMessages;
	}

	public addReaction(message_id: string, reaction_id: string): void {
		if (!this.messages[message_id]) return;
		const newReactions = new Set(this.messages[message_id].reactions);
		newReactions.add(reaction_id);
		this.messages[message_id] = { ...this.messages[message_id], reactions: newReactions };
	}

	public removeReaction(message_id: string, reaction_id: string): void {
		if (!this.messages[message_id]) return;
		const newReactions = new Set(this.messages[message_id].reactions);
		newReactions.delete(reaction_id);
		this.messages[message_id] = { ...this.messages[message_id], reactions: newReactions };
	}
}

export const message_store = MessageStore.getInstance();
