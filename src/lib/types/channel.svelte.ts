import type { IConversation } from '$lib/types/conversation.svelte';

export interface IChannel {
	id: string;
	name: string;
	description?: string;
	slug: string;
	workspace_id: string;
	conversation_id: string;
}

export interface IChannelCreate {
	name: string;
	description?: string;
	workspace_id: string;
}

export interface IChannelUpdate {
	id: string;
	name: string;
	description?: string;
}

export interface IChannelDelete {
	id: string;
}
