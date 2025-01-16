import { buildMessage, buildConversation } from '$lib/helpers.svelte';
import type { IReaction } from '$lib/types/messages.svelte';
import { message_store } from '$lib/stores/messages.svelte';
import { reaction_store } from '$lib/stores/reaction.svelte';
import { conversation_store } from '$lib/stores/conversation.svelte';
import { message_api } from '$lib/api/message.svelte';

export async function messageSent(message_id: string) {
	try {
		// Get the full message details
		const message = await message_api.getMessage(message_id);
		if (!message) {
			console.warn('Message not found:', message_id);
			return;
		}

		// Ensure we have the conversation
		const conversation = conversation_store.getConversation(message.conversation_id);
		if (!conversation) {
			await buildConversation(message.conversation_id);
		}

		// If this is a reply, ensure we have the parent message
		if (message.parent_id) {
			const parentMessage = message_store.getMessage(message.parent_id);
			if (!parentMessage) {
				await buildMessage(message.parent_id);
			}
		}

		// Build and store the message
		await buildMessage(message_id);
		const builtMessage = message_store.getMessage(message_id);

		if (!builtMessage) {
			console.warn('Message not found after building:', message_id);
			return;
		}

		// Only add root messages to the conversation
		if (!builtMessage.parent_id) {
			conversation_store.addMessage(message.conversation_id, message_id);
		} else {
			// For replies, add to parent's children
			message_store.addMessage(builtMessage);
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
		reaction_store.addReaction(message_id, reaction);
	}
	message_store.addReaction(message_id, reaction);
}

export async function reactionRemoved(message_id: string, reaction_id: string) {
	message_store.removeReaction(message_id, reaction_id);
	reaction_store.removeReaction(reaction_id);
}
