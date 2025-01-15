import type { IConversation } from '$lib/types/conversation.svelte';
import type { IMessage } from '$lib/types/messages.svelte';

export class ConversationStore {
	static #instance: ConversationStore;
	private conversations = $state<Record<string, IConversation>>({});

	private constructor() { }

	public static getInstance(): ConversationStore {
		if (!ConversationStore.#instance) {
			ConversationStore.#instance = new ConversationStore();
		}
		return ConversationStore.#instance;
	}

	public getConversation(conversation_id: string): IConversation {
		return this.conversations[conversation_id];
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
			users_typing: Array.isArray(conversation.users_typing)
				? [...conversation.users_typing]
				: Array.from(conversation.users_typing || [])
		};

		this.conversations = {
			...this.conversations,
			[conversation.id]: newConversation
		};
	}

	public addConversation(conversation: IConversation): void {
		// Initialize messages array if not present
		const conversationToAdd = {
			...conversation,
			messages: Array.isArray(conversation.messages) ? [...conversation.messages] : [],
			users_typing: Array.isArray(conversation.users_typing)
				? [...conversation.users_typing]
				: Array.from(conversation.users_typing || [])
		};

		this.conversations = {
			...this.conversations,
			[conversationToAdd.id]: conversationToAdd
		};
	}

	public removeConversation(conversation_id: string): void {
		const { [conversation_id]: _, ...rest } = this.conversations;
		this.conversations = rest;
	}

	public addMessage(conversation_id: string, message: IMessage): void {
		console.log('========== ADDING MESSAGE TO CONVERSATION ==========');
		console.log('Adding message to conversation:', conversation_id);
		console.log('Message to add:', message);
		if (!this.conversations[conversation_id]) {
			console.log('Conversation not found in store');
			return;
		}

		const conversation = this.conversations[conversation_id];
		console.log('Found conversation:', conversation);

		// Only add root messages to the conversation's message list
		if (!message.parent_id) {
			console.log('Message is a root message, adding to conversation messages');
			// Create a new Set to ensure uniqueness
			const messagesSet = new Set([...conversation.messages || [], message.id]);
			console.log('Updated messages set:', messagesSet);
			this.conversations = {
				...this.conversations,
				[conversation_id]: {
					...conversation,
					messages: Array.from(messagesSet)
				}
			};
			console.log('Updated conversation:', this.conversations[conversation_id]);
		} else {
			console.log('Message is a child message, not adding to conversation messages');
		}
		console.log('Current conversations in store:', this.conversations);
		console.log('========== END ADDING MESSAGE TO CONVERSATION ==========');
	}

	public removeMessage(conversation_id: string, message_id: string): void {
		if (!this.conversations[conversation_id]) return;

		const conversation = this.conversations[conversation_id];
		this.conversations = {
			...this.conversations,
			[conversation_id]: {
				...conversation,
				messages: conversation.messages.filter((id: string) => id !== message_id)
			}
		};
	}

	public updateConversation(conversation_id: string, updates: Partial<IConversation>): void {
		if (this.conversations[conversation_id]) {
			this.conversations = {
				...this.conversations,
				[conversation_id]: {
					...this.conversations[conversation_id],
					...updates
				}
			};
		}
	}

	public addUserTyping(conversation_id: string, user_id: string): void {
		const conversation = this.getConversation(conversation_id);
		if (!conversation) return;

		// Convert to Set for operation, then back to Array for storage
		const typingUsers = new Set(conversation.users_typing);
		typingUsers.add(user_id);
		conversation.users_typing = Array.from(typingUsers);

		this.setConversation(conversation);
	}

	public removeUserTyping(conversation_id: string, user_id: string): void {
		const conversation = this.getConversation(conversation_id);
		if (!conversation) return;

		// Convert to Set for operation, then back to Array for storage
		const typingUsers = new Set(conversation.users_typing);
		typingUsers.delete(user_id);
		conversation.users_typing = Array.from(typingUsers);

		this.setConversation(conversation);
	}
}

export const conversation_store = ConversationStore.getInstance();
