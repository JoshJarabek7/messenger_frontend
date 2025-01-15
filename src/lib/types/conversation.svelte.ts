import type { IMessage } from './messages.svelte';

export type ConversationType = 'direct' | 'channel';

export interface IConversation {
	id: string;
	conversation_type: ConversationType;
	user_id?: string;
	channel_id?: string;
	messages: string[];
	users_typing: Set<string> | string[];
	is_temporary?: boolean;
}

export interface IDMCreate {
	conversation_type: ConversationType;
	user_id: string;
	content: string;
	s3_key?: string;
}

export interface IMessageCreate {
	conversation_id: string;
	content: string;
	s3_key?: string;
	parent_message_id?: string;
}

export interface IReactionCreate {
	message_id: string;
	emoji: string;
}

export interface IReactionDelete {
	message_id: string;
	emoji: string;
}
