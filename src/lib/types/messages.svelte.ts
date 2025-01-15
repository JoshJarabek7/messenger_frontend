import type { IAttachment } from './file.svelte';
import type { SvelteMap, SvelteSet } from 'svelte/reactivity';

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
	reactions: SvelteSet<string>;
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
	reactions: SvelteMap<string, SvelteSet<string>>;
	children?: IBuiltMessage[];
	parent_id?: string;
	created_at: string;
	updated_at: string;
}

export interface IBuiltConversation {
	id: string;
	messages: IBuiltMessage[];
	users_typing: SvelteSet<string>;
	conversation_type: 'direct' | 'channel';
}
