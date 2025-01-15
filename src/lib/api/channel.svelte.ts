import type {
	IChannel,
	IChannelCreate,
	IChannelUpdate,
	IChannelDelete
} from '$lib/types/channel.svelte';
import { API_BASE_URL } from '$lib/config';

class ChannelAPI {
	public async getChannel(channelId: string): Promise<IChannel> {
		const response = await fetch(`${API_BASE_URL}/channels/${channelId}`, {
			credentials: 'include',
			method: 'GET'
		});
		if (!response.ok) {
			if (response.status === 403) {
				throw new Error('You are not authorized to view this channel.');
			}
			throw new Error('Failed to get channel.');
		}
		const data: IChannel = await response.json();
		return data;
	}

	public async getWorkspaceChannels(workspaceId: string): Promise<IChannel[]> {
		const response = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/channels`, {
			credentials: 'include',
			method: 'GET'
		});
		if (!response.ok) {
			throw new Error('Failed to get workspace channels.');
		}
		const data: IChannel[] = await response.json();
		return data;
	}

	public async createChannel(workspaceId: string, channel: IChannelCreate): Promise<IChannel> {
		const response = await fetch(`${API_BASE_URL}/workspaces/${workspaceId}/channels`, {
			credentials: 'include',
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(channel)
		});
		if (!response.ok) {
			throw new Error('Failed to create channel.');
		}
		const data: IChannel = await response.json();
		return data;
	}

	public async updateChannel(channel: IChannelUpdate): Promise<IChannel> {
		const response = await fetch(`${API_BASE_URL}/channels/${channel.id}`, {
			credentials: 'include',
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(channel)
		});
		if (!response.ok) {
			if (response.status === 403) {
				throw new Error('You are not authorized to update this channel.');
			}
			throw new Error('Failed to update channel.');
		}
		const data: IChannel = await response.json();
		return data;
	}

	public async deleteChannel(channel: IChannelDelete): Promise<void> {
		const response = await fetch(`${API_BASE_URL}/channels/${channel.id}`, {
			credentials: 'include',
			method: 'DELETE'
		});
		if (!response.ok) {
			if (response.status === 403) {
				throw new Error('You are not authorized to delete this channel.');
			}
			throw new Error('Failed to delete channel.');
		}
	}

	public async doesChannelExist(channelName: string, workspaceId: string): Promise<boolean> {
		const response = await fetch(
			`${API_BASE_URL}/workspaces/${workspaceId}/channels/exists?name=${encodeURIComponent(channelName)}`,
			{
				credentials: 'include',
				method: 'GET'
			}
		);
		if (!response.ok) {
			throw new Error('Failed to check channel existence');
		}
		const data: Record<string, boolean> = await response.json();
		return data.exists;
	}
}

export const channel_api = new ChannelAPI();
