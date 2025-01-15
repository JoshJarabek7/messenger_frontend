import type { IUser } from '$lib/types/user.svelte';
import { ws } from './websocket.svelte';
import { SvelteMap } from 'svelte/reactivity';

class UserStore {
	static #instance: UserStore;
	private users = $state<SvelteMap<string, IUser>>(new SvelteMap());
	private me = $state<IUser>();

	private constructor() { }

	public static getInstance(): UserStore {
		if (!UserStore.#instance) {
			UserStore.#instance = new UserStore();
		}
		return UserStore.#instance;
	}

	public getUser(user_id: string): IUser | undefined {
		return this.users.get(user_id) ?? undefined;
	}

	public getMe(): IUser {
		if (!this.me) {
			throw new Error('Me is not set.');
		}
		return this.me;
	}

	public setMe(user: IUser): void {
		this.me = user;
		this.addUser(user);
		// Update online status after user is set
		ws.updateOnlineStatus();
	}

	public addUser(user: IUser): void {
		this.users.set(user.id, user);
	}

	public updateUser(user_id: string, updates: Partial<IUser>): void {
		if (!this.users.get(user_id)) return;
		const user = this.users.get(user_id)!;
		this.users.set(user_id, { ...user, ...updates });
	}

	public removeUser(user_id: string): void {
		this.users.delete(user_id);
	}
}
export const user_store = UserStore.getInstance();
