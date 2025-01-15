import { buildMessage, buildConversation } from '$lib/helpers.svelte';
import type { IReaction } from '$lib/types/messages.svelte';
import { message_store } from '$lib/stores/messages.svelte';
import { reaction_store } from '$lib/stores/reaction.svelte';
import { conversation_store } from '$lib/stores/conversation.svelte';
import { message_api } from '$lib/api/message.svelte';

export async function messageSent(message_id: string) {
	console.log('========== MESSAGE SENT EVENT ==========');
	console.log('Handling messageSent event for message:', message_id);
	try {
		const message = await message_api.getMessage(message_id);
		if (!message) {
			console.warn('Message not found:', message_id);
			return;
		}
		console.log('Raw message from API:', message);

		// If this is a reply, ensure we have the parent message first
		if (message.parent_id) {
			console.log(`Message ${message_id} is a child message with parent:`, message.parent_id);
			const parentMessage = message_store.getMessage(message.parent_id);
			if (!parentMessage) {
				console.log('Parent message not found, fetching it...');
				await buildMessage(message.parent_id);
				console.log('Parent message after building:', message_store.getMessage(message.parent_id));
			} else {
				console.log('Existing parent message:', parentMessage);
			}
		} else {
			console.log(`Message ${message_id} is a root message`);
		}

		// Now build and store the message
		console.log('Building message...');
		await buildMessage(message_id);
		const builtMessage = message_store.getMessage(message_id);

		if (!builtMessage) {
			console.warn('Message not found after building:', message_id);
			return;
		}
		console.log('Built message:', builtMessage);

		// Only add root messages to the conversation
		if (!builtMessage.parent_id) {
			console.log('Adding root message to conversation store...');
			conversation_store.addMessage(message.conversation_id, builtMessage);
			console.log('Successfully added root message to conversation:', message_id);
			console.log('Current conversation messages:', conversation_store.getConversation(message.conversation_id).messages);
		} else {
			console.log('Skipping adding child message to conversation:', message_id);
			console.log('Parent message children after update:', message_store.getMessage(builtMessage.parent_id).children);
		}
		console.log('========== END MESSAGE SENT EVENT ==========');
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
