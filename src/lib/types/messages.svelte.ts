import type { IAttachment } from './file.svelte';

export interface IReaction {
	id: string;
	user_id: string;
	emoji: string;
}

export interface IMessage {
	id: string;
	user_id: string;
	content: string;
	file_id?: string;
	reactions: Set<string>;
	children?: string[];
	parent_id?: string;
	conversation_id: string;
	created_at: string;
	updated_at: string;
}

export interface IBuiltMessage {
	id: string;
	user_id: string;
	content: string;
	file_id?: string;
	reactions: Record<string, Set<string>>;
	children?: IBuiltMessage[];
	parent_id?: string;
	created_at: string;
	updated_at: string;
}

export interface IBuiltConversation {
	id: string;
	messages: IBuiltMessage[];
	users_typing: Set<string>;
	conversation_type: 'direct' | 'channel';
}
