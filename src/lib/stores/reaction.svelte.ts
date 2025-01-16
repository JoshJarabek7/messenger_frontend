import type { IReaction } from '$lib/types/messages.svelte';
import { SvelteMap } from 'svelte/reactivity';
import { message_store } from '$lib/stores/messages.svelte';
class ReactionStore {
	static #instance: ReactionStore;
	private reactions = $state<SvelteMap<string, IReaction>>(new SvelteMap());

	private constructor() { }

	public static getInstance(): ReactionStore {
		if (!ReactionStore.#instance) {
			ReactionStore.#instance = new ReactionStore();
		}
		return ReactionStore.#instance;
	}

	public getReaction(reaction_id: string): IReaction | undefined {
		return this.reactions.get(reaction_id) ?? undefined;
	}

	public addReaction(message_id: string, reaction: IReaction): void {
		if (!reaction || !message_id) {
			console.warn('Attempted to add invalid reaction:', { message_id, reaction });
			return;
		}

		this.reactions.set(reaction.id, reaction);

		// Ensure the reaction is added to the corresponding message
		const message = message_store.getMessage(message_id);
		if (message && reaction.emoji) {
			if (!message.reactions) {
				message.reactions = new SvelteMap();
			}
			message.reactions.set(reaction.id, reaction);
			message_store.updateMessage(message_id, message);
		}
	}

	public removeReaction(reaction_id: string): void {
		if (!reaction_id) return;
		this.reactions.delete(reaction_id);
	}
}

export const reaction_store = ReactionStore.getInstance();
