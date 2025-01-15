import type { IChannel } from '$lib/types/channel.svelte';

class ChannelStore {
	// This should handle the conversations as well inside of the channel object.
	static #instance: ChannelStore;
	private channels = $state<Record<string, IChannel>>({});

	private constructor() {}

	public static getInstance(): ChannelStore {
		if (!ChannelStore.#instance) {
			ChannelStore.#instance = new ChannelStore();
		}
		return ChannelStore.#instance;
	}

	public getChannel(channelId: string): IChannel {
		return this.channels[channelId];
	}

	public updateChannel(channel_id: string, updates: Partial<IChannel>): void {
		if (!this.channels[channel_id]) return;
		Object.assign(this.channels[channel_id], updates);
	}

	public addChannel(channel: IChannel): void {
		this.channels[channel.id] = channel;
	}

	public removeChannel(channel_id: string): void {
		delete this.channels[channel_id];
	}
}

export const channel_store = ChannelStore.getInstance();
