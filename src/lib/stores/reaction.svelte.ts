import type { IReaction } from '$lib/types/messages.svelte';

class ReactionStore {
	static #instance: ReactionStore;
	private reactions = $state<Record<string, IReaction>>({});

	private constructor() {}

	public static getInstance(): ReactionStore {
		if (!ReactionStore.#instance) {
			ReactionStore.#instance = new ReactionStore();
		}
		return ReactionStore.#instance;
	}

	public getReaction(reaction_id: string): IReaction | undefined {
		return this.reactions[reaction_id];
	}

	public addReaction(reaction: IReaction): void {
		this.reactions[reaction.id] = reaction;
	}

	public removeReaction(reaction_id: string): void {
		delete this.reactions[reaction_id];
	}
}

export const reaction_store = ReactionStore.getInstance();
