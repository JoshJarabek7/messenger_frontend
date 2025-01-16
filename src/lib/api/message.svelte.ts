import type { IMessage, IGetMessageResponse } from '$lib/types/messages.svelte';
import { API_BASE_URL } from '$lib/config';

class MessageAPI {
	public async getMessage(message_id: string): Promise<IGetMessageResponse> {
		const message = await fetch(`${API_BASE_URL}/message/${message_id}`);
		if (!message) {
			throw new Error('Unable to get message.');
		}
		const result: IGetMessageResponse = await message.json();
		return result;
	}

	public async createMessage(
		conversation_id: string,
		content: string,
		file_id?: string,
		parent_message_id?: string
	): Promise<IMessage> {
		const response = await fetch(`${API_BASE_URL}/conversations/${conversation_id}/messages`, {
			method: 'POST',
			credentials: 'include',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				content,
				file_id,
				parent_id: parent_message_id
			})
		});

		if (!response.ok) {
			throw new Error('Failed to create message.');
		}

		const data: IMessage = await response.json();
		return data;
	}
}

export const message_api = new MessageAPI();
