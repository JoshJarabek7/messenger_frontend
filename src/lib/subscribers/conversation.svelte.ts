import { buildConversation, unbuildConversation } from '$lib/helpers.svelte';
import { conversation_store } from '$lib/stores/conversation.svelte';
import { ui_store } from '$lib/stores/ui.svelte';

export async function conversationCreated(conversation_id: string) {
	await buildConversation(conversation_id);
}

export async function userTyping(conversation_id: string, user_id: string) {
	const conversation = conversation_store.getConversation(conversation_id);
	if (!conversation) {
		await buildConversation(conversation_id);
	}
	conversation_store.addUserTyping(conversation_id, user_id);
}

export async function userStoppedTyping(conversation_id: string, user_id: string) {
	const conversation = conversation_store.getConversation(conversation_id);
	if (!conversation) {
		await buildConversation(conversation_id);
	}
	conversation_store.removeUserTyping(conversation_id, user_id);
}

export async function directMessageConversationDeleted(conversation_id: string) {
	if (ui_store.directMessageConversationSelected() === conversation_id) {
		ui_store.unselectDirectMessageConversation();
	}
	unbuildConversation(conversation_id);
}
