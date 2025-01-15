import type { IReaction } from '$lib/types/messages.svelte';
import { SvelteMap } from 'svelte/reactivity';

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

	public addReaction(reaction: IReaction): void {
		this.reactions.set(reaction.id, reaction);
	}

	public removeReaction(reaction_id: string): void {
		this.reactions.delete(reaction_id);
	}
}

export const reaction_store = ReactionStore.getInstance();
