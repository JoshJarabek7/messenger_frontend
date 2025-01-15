import { user_store } from '$lib/stores/user.svelte';
import type { IUser } from '$lib/types/user.svelte';
import { buildUser, unbuildUser } from '$lib/helpers.svelte';

export async function userUpdated(user_id: string, user: Partial<IUser>) {
	const user_exists = user_store.getUser(user_id);
	if (!user_exists) {
		await buildUser(user_id);
	} else {
		if (user.s3_key !== user_exists.s3_key) {
			const was_online = user_exists.online;
			unbuildUser(user_id);
			await buildUser(user_id);
			user_store.updateUser(user_id, { online: was_online });
		} else {
			if (user.online === undefined) {
				const { online, ...updates } = user;
				user_store.updateUser(user_id, updates);
			} else {
				user_store.updateUser(user_id, user);
			}
		}
	}
}

export async function userOnline(user_id: string) {
	const user_exists = user_store.getUser(user_id);
	if (!user_exists) {
		await buildUser(user_id);
	} else {
		user_store.updateUser(user_id, { online: true });
	}
}

export async function userOffline(user_id: string) {
	const user_exists = user_store.getUser(user_id);
	if (!user_exists) {
		await buildUser(user_id);
	}
	user_store.updateUser(user_id, { online: false });
}
