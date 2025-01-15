import type {
	IConversation,
	IDMCreate,
	IMessageCreate,
	IReactionCreate,
	IReactionDelete
} from '$lib/types/conversation.svelte';
import type { IMessage, IReaction } from '$lib/types/messages.svelte';
import { API_BASE_URL } from '$lib/config';

class ConversationAPI {
	public async getConversation(conversation_id: string): Promise<IConversation> {
		const response = await fetch(`${API_BASE_URL}/conversations/${conversation_id}`, {
			credentials: 'include',
			method: 'GET'
		});
		if (!response.ok) {
			if (response.status === 403) {
				throw new Error('You are not authorized to view this conversation.');
			}
			throw new Error('Failed to get conversation.');
		}
		const data: IConversation = await response.json();
		return data;
	}

	public async deleteConversation(conversation_id: string): Promise<void> {
		const response = await fetch(`${API_BASE_URL}/conversations/${conversation_id}`, {
			method: 'DELETE',
			credentials: 'include'
		});
		if (!response.ok) {
			if (response.status === 403) {
				throw new Error('You are not authorized to delete this conversation.');
			}
			throw new Error('Failed to delete conversation.');
		}
	}

	public async getDirectMessages(): Promise<IConversation[]> {
		const response = await fetch(`${API_BASE_URL}/dm/all`, {
			credentials: 'include',
			method: 'GET'
		});

		if (!response.ok) {
			throw new Error('Failed to get direct messages.');
		}
		const data: IConversation[] = await response.json();
		return data;
	}

	public async createDirectMessageConversation(dm: IDMCreate): Promise<IConversation> {
		const response = await fetch(`${API_BASE_URL}/dm`, {
			method: 'POST',
			credentials: 'include',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				conversation_type: dm.conversation_type,
				user_id: dm.user_id,
				content: dm.content,
				s3_key: dm.s3_key
			})
		});
		if (!response.ok) {
			throw new Error('Failed to create direct message conversation.');
		}
		const data: IConversation = await response.json();
		return data;
	}

	public async sendDirectMessage(dm: IMessageCreate): Promise<IMessage> {
		const response = await fetch(`${API_BASE_URL}/messages`, {
			method: 'POST',
			credentials: 'include',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				conversation_id: dm.conversation_id,
				content: dm.content,
				s3_key: dm.s3_key,
				parent_message_id: dm.parent_message_id
			})
		});
		if (!response.ok) {
			if (response.status === 403) {
				throw new Error('You are not authorized to send this message.');
			}
			throw new Error('Failed to send direct message.');
		}
		const data: IMessage = await response.json();
		return data;
	}

	public async reactToDirectMessage(reaction: IReactionCreate): Promise<IReaction> {
		const response = await fetch(`${API_BASE_URL}/messages/${reaction.message_id}/reactions`, {
			method: 'POST',
			credentials: 'include',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				emoji: reaction.reaction
			})
		});
		if (!response.ok) {
			if (response.status === 403) {
				throw new Error('You are not authorized to react to this message.');
			}
			throw new Error('Failed to react to direct message.');
		}
		const data: IReaction = await response.json();
		return data;
	}

	public async deleteReactionFromDirectMessage(reaction: IReactionDelete): Promise<void> {
		const response = await fetch(
			`${API_BASE_URL}/messages/${reaction.message_id}/reactions/${reaction.reaction}`,
			{
				method: 'DELETE',
				credentials: 'include'
			}
		);
		if (!response.ok) {
			if (response.status === 403) {
				throw new Error('You are not authorized to delete this reaction.');
			}
			throw new Error('Failed to delete reaction from direct message.');
		}
	}
}

export const conversation_api = new ConversationAPI();
