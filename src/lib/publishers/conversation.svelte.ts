import { MessageType } from '$lib/types/message_types.svelte';
import { ws } from '$lib/stores/websocket.svelte';

export async function publishTyping(conversation_id: string, user_id: string): Promise<void> {
	const message = {
		message_type: MessageType.USER_IS_TYPING,
		conversation_id,
		user_id
	};
	const json = JSON.stringify(message);
	ws.send(json);
}

export async function publishStoppedTyping(
	conversation_id: string,
	user_id: string
): Promise<void> {
	const message = {
		message_type: MessageType.USER_STOPPED_TYPING,
		conversation_id,
		user_id
	};
	const json = JSON.stringify(message);
	ws.send(json);
}
