import type { IMessage, IReaction, IGetMessageResponse } from '$lib/types/messages.svelte';
import { SvelteMap, SvelteSet } from 'svelte/reactivity';

export class MessageStore {
	static #instance: MessageStore;
	private messages = $state<SvelteMap<string, IMessage>>(new SvelteMap());

	private constructor() { }

	public static getInstance(): MessageStore {
		if (!MessageStore.#instance) {
			MessageStore.#instance = new MessageStore();
		}
		return MessageStore.#instance;
	}

	public getMessage(message_id: string): IMessage | null {
		return this.messages.get(message_id) ?? null;
	}

	public addMessage(message: IMessage | IGetMessageResponse): void {
		// Initialize reactions map
		let reactionsMap = new SvelteMap<string, IReaction>();

		// Handle reactions based on type
		if (message.reactions) {
			if (message.reactions instanceof SvelteMap) {
				// If it's already a SvelteMap<string, IReaction>, use it directly
				reactionsMap = message.reactions;
			} else {
				// Convert from backend format - a record of reaction objects
				for (const [reactionId, reaction] of Object.entries(message.reactions)) {
					reactionsMap.set(reactionId, reaction as IReaction);
				}
			}
		}

		const messageToAdd = {
			...message,
			children: message.children || [],
			reactions: reactionsMap
		};
		if (messageToAdd.parent_id) {
			const parentMessage = this.messages.get(messageToAdd.parent_id);
			if (parentMessage) {
				const childrenSet = new SvelteSet([...parentMessage.children || [], messageToAdd.id]);
				this.messages.set(messageToAdd.parent_id, {
					...parentMessage,
					children: Array.from(childrenSet)
				});
			}
		}

		this.messages.set(messageToAdd.id, messageToAdd as IMessage);
	}

	public updateMessage(message_id: string, updates: Partial<IMessage>): void {
		const existingMessage = this.messages.get(message_id);
		if (existingMessage) {
			const updatedMessage = { ...existingMessage, ...updates } as IMessage;

			// If parent_id is being updated, handle the parent-child relationship
			if (updates.parent_id !== undefined) {
				// Remove from old parent if exists
				const oldParentId = existingMessage.parent_id;
				if (oldParentId && this.messages.get(oldParentId)) {
					const oldParent = this.messages.get(oldParentId)!;
					this.messages.set(oldParentId, {
						...oldParent,
						children: (oldParent.children || []).filter(id => id !== message_id)
					} as IMessage);
				}

				// Add to new parent if exists
				if (updates.parent_id && this.messages.get(updates.parent_id)) {
					const newParent = this.messages.get(updates.parent_id)!;
					const newChildren = new SvelteSet([
						...(newParent.children || []),
						message_id
					]);
					this.messages.set(updates.parent_id, {
						...newParent,
						children: Array.from(newChildren)
					} as IMessage);
				}
			}

			this.messages.set(message_id, updatedMessage);
		}
	}

	public removeMessage(message_id: string): void {
		const messageToRemove = this.messages.get(message_id);
		if (!messageToRemove) return;

		// Remove from parent's children if it's a reply
		if (messageToRemove.parent_id && this.messages.get(messageToRemove.parent_id)) {
			const parent = this.messages.get(messageToRemove.parent_id)!;
			this.messages.set(messageToRemove.parent_id, {
				...parent,
				children: (parent.children || []).filter(id => id !== message_id)
			} as IMessage);
		}

		// Remove all child messages recursively
		if (messageToRemove.children) {
			messageToRemove.children.forEach(childId => this.removeMessage(childId));
		}

		this.messages.delete(message_id);
	}

	public addReaction(message_id: string, reaction: IReaction): void {
		const message = this.getMessage(message_id);
		if (!message) return;

		if (!message.reactions) {
			message.reactions = new SvelteMap();
		}
		message.reactions.set(reaction.id, reaction);
		this.messages.set(message_id, message);
	}

	public removeReaction(message_id: string, reaction_id: string): void {
		const message = this.getMessage(message_id);
		if (!message?.reactions) return;

		message.reactions.delete(reaction_id);
		this.messages.set(message_id, message);
	}
}

export const message_store = MessageStore.getInstance();
