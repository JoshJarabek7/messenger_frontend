import type { IConversation } from '$lib/types/conversation.svelte';
import type { IMessage } from '$lib/types/messages.svelte';
import { SvelteSet } from 'svelte/reactivity';
import { SvelteMap } from 'svelte/reactivity';
export class ConversationStore {
	static #instance: ConversationStore;
	private conversations = $state<SvelteMap<string, IConversation>>(new SvelteMap());

	private constructor() { }

	public static getInstance(): ConversationStore {
		if (!ConversationStore.#instance) {
			ConversationStore.#instance = new ConversationStore();
		}
		return ConversationStore.#instance;
	}

	public getConversation(conversation_id: string): IConversation | null {
		return this.conversations.get(conversation_id) ?? null;
	}

	public getAllDirectMessages(): IConversation[] {
		return Object.values(this.conversations).filter(
			(conversation) => conversation.conversation_type === 'direct'
		);
	}

	public setConversation(conversation: IConversation): void {
		// Ensure we have arrays for messages and users_typing
		const newConversation = {
			...conversation,
			messages: Array.isArray(conversation.messages) ? [...conversation.messages] : [],
			users_typing: new SvelteSet(Array.isArray(conversation.users_typing)
				? conversation.users_typing
				: Array.from(conversation.users_typing || []))
		};

		this.conversations.set(conversation.id, newConversation);
	}

	public addConversation(conversation: IConversation): void {
		// Initialize messages array if not present
		const conversationToAdd = {
			...conversation,
			messages: Array.isArray(conversation.messages) ? [...conversation.messages] : [],
			users_typing: new SvelteSet(Array.isArray(conversation.users_typing)
				? conversation.users_typing
				: Array.from(conversation.users_typing || []))
		};

		this.conversations.set(conversationToAdd.id, conversationToAdd);
	}

	public removeConversation(conversation_id: string): void {
		this.conversations.delete(conversation_id);
	}

	public addMessage(conversation_id: string, message: IMessage): void {
		if (!this.conversations.get(conversation_id)) return;

		const conversation = this.conversations.get(conversation_id);
		if (!conversation) return;

		if (!message.parent_id) {
			const messagesSet = new SvelteSet([...conversation.messages || [], message.id]);
			this.conversations.set(conversation_id, {
				...conversation,
				messages: Array.from(messagesSet)
			});
		}
	}

	public removeMessage(conversation_id: string, message_id: string): void {
		if (!this.conversations.get(conversation_id)) return;
		const conversation = this.conversations.get(conversation_id);
		if (!conversation) return;
		this.conversations.set(conversation_id, {
			...conversation,
			messages: conversation.messages.filter((id: string) => id !== message_id)
		});
	}

	public updateConversation(conversation_id: string, updates: Partial<IConversation>): void {
		if (!this.conversations.get(conversation_id)) return;
		const conversation = this.conversations.get(conversation_id);
		if (!conversation) return;
		this.conversations.set(conversation_id, {
			...conversation,
			...updates
		});
	}

	public addUserTyping(conversation_id: string, user_id: string): void {
		const conversation = this.conversations.get(conversation_id);
		if (!conversation) return;
		conversation.users_typing.add(user_id);
	}

	public removeUserTyping(conversation_id: string, user_id: string): void {
		const conversation = this.conversations.get(conversation_id);
		if (!conversation) return;
		conversation.users_typing.delete(user_id);
	}
}

export const conversation_store = ConversationStore.getInstance();
