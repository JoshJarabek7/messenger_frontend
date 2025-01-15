import { channel_store } from '$lib/stores/channel.svelte';
import { workspace_store } from '$lib/stores/workspace.svelte';
import type { IChannel } from '$lib/types/channel.svelte';
import {
	buildChannel,
	unbuildChannel,
	buildConversation
} from '$lib/helpers.svelte';
import { ui_store } from '$lib/stores/ui.svelte';

export async function channelCreated(channel_id: string, channel: IChannel) {
	const channel_exists = channel_store.getChannel(channel_id);
	if (channel_exists) return;

	try {
		// First add the channel to the channel store
		channel_store.addChannel(channel);

		// Then add it to the workspace's channels
		workspace_store.addChannel(channel.workspace_id, channel_id);

		// Build the channel's conversation if it exists
		if (channel.conversation_id) {
			await buildConversation(channel.conversation_id);
		}
	} catch (error) {
		console.error('Error in channelCreated:', error);
		throw error;
	}
}

export async function channelUpdated(channel_id: string, updates: Partial<IChannel>) {
	const channel = channel_store.getChannel(channel_id);
	await buildChannel(channel_id);
	channel_store.updateChannel(channel_id, updates);
}

export async function channelDeleted(channel_id: string) {
	const channel = channel_store.getChannel(channel_id);
	if (channel) {
		workspace_store.removeChannel(channel.workspace_id, channel_id);
	}
	if (ui_store.channelSelected() === channel_id) {
		ui_store.unselectChannel();
	}
	unbuildChannel(channel_id);
}
