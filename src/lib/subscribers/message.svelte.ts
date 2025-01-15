import { buildMessage, buildConversation } from '$lib/helpers.svelte';
import type { IReaction } from '$lib/types/messages.svelte';
import { message_store } from '$lib/stores/messages.svelte';
import { reaction_store } from '$lib/stores/reaction.svelte';
import { conversation_store } from '$lib/stores/conversation.svelte';
import { message_api } from '$lib/api/message.svelte';

export async function messageSent(message_id: string) {
	try {
		const message = await message_api.getMessage(message_id);
		if (!message) {
			console.warn('Message not found:', message_id);
			return;
		}

		// If this is a reply, ensure we have the parent message first
		if (message.parent_id) {
			const parentMessage = message_store.getMessage(message.parent_id);
			if (!parentMessage) {
				await buildMessage(message.parent_id);
			}
		}

		// Now build and store the message
		await buildMessage(message_id);
		const builtMessage = message_store.getMessage(message_id);

		if (!builtMessage) {
			console.warn('Message not found after building:', message_id);
			return;
		}

		// Only add root messages to the conversation
		if (!builtMessage.parent_id) {
			conversation_store.addMessage(message.conversation_id, builtMessage);
		}
	} catch (error) {
		console.error('Error handling messageSent event:', error);
	}
}

export async function reactionAdded(message_id: string, reaction: IReaction) {
	const message = message_store.getMessage(message_id);
	if (!message) {
		await buildMessage(message_id);
	}
	if (!reaction_store.getReaction(reaction.id)) {
		reaction_store.addReaction(reaction);
	}
	message_store.addReaction(message_id, reaction.id);
}

export async function reactionRemoved(message_id: string, reaction_id: string) {
	message_store.removeReaction(message_id, reaction_id);
	reaction_store.removeReaction(reaction_id);
}
