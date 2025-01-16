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
				emoji: reaction.emoji
			})
		});

		const data = await response.json();

		if (!response.ok) {
			if (response.status === 400 && data.existing_reaction) {
				return data.existing_reaction;
			}
			throw new Error(data.detail || 'Failed to add reaction.');
		}

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
