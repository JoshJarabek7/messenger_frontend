import type { IChannel } from '$lib/types/channel.svelte';
import { SvelteMap } from 'svelte/reactivity';

class ChannelStore {
	// This should handle the conversations as well inside of the channel object.
	static #instance: ChannelStore;
	private channels = $state<SvelteMap<string, IChannel>>(new SvelteMap());

	private constructor() { }

	public static getInstance(): ChannelStore {
		if (!ChannelStore.#instance) {
			ChannelStore.#instance = new ChannelStore();
		}
		return ChannelStore.#instance;
	}

	public getChannel(channelId: string): IChannel | null {
		return this.channels.get(channelId) ?? null;
	}

	public updateChannel(channel_id: string, updates: Partial<IChannel>): void {
		const channel = this.channels.get(channel_id);
		if (!channel) return;
		this.channels.set(channel_id, { ...channel, ...updates });
	}

	public addChannel(channel: IChannel): void {
		this.channels.set(channel.id, channel);
	}

	public removeChannel(channel_id: string): void {
		this.channels.delete(channel_id);
	}
}

export const channel_store = ChannelStore.getInstance();
