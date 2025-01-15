import type { IReaction } from '$lib/types/messages.svelte';
import { API_BASE_URL } from '$lib/config';

interface IReactionRequest {
	message_id: string;
	emoji: string;
}

class ReactionAPI {
	public async addReaction(message_id: string, reaction: IReactionRequest): Promise<IReaction> {
		const response = await fetch(`${API_BASE_URL}/messages/${message_id}/reactions`, {
			credentials: 'include',
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				message_id: message_id,
				emoji: reaction.emoji
			})
		});

		if (!response.ok) {
			throw new Error('Failed to add reaction.');
		}

		const data: IReaction = await response.json();
		return data;
	}

	public async removeReaction(message_id: string, reaction_id: string): Promise<void> {
		const response = await fetch(
			`${API_BASE_URL}/messages/${message_id}/reactions/${reaction_id}`,
			{
				credentials: 'include',
				method: 'DELETE'
			}
		);
		if (!response.ok) {
			throw new Error('Failed to remove reaction.');
		}
		return;
	}
}

export const reactionAPI = new ReactionAPI();
