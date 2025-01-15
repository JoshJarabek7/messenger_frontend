import type { IUser } from '$lib/types/user.svelte';
import { ws } from './websocket.svelte';

class UserStore {
	static #instance: UserStore;
	private users = $state<Record<string, IUser>>({});
	private me = $state<IUser>();

	private constructor() { }

	public static getInstance(): UserStore {
		if (!UserStore.#instance) {
			UserStore.#instance = new UserStore();
		}
		return UserStore.#instance;
	}

	public getUser(user_id: string): IUser {
		return this.users[user_id];
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
		this.users[user.id] = user;
	}

	public updateUser(user_id: string, updates: Partial<IUser>): void {
		if (!this.users[user_id]) return;
		Object.assign(this.users[user_id], updates);
	}

	public removeUser(user_id: string): void {
		delete this.users[user_id];
	}
}
export const user_store = UserStore.getInstance();
