import { API_BASE_URL } from '$lib/config';
import type { IUser, IUserUpdate, IUserUpdateImage } from '$lib/types/user.svelte';

class UserAPI {
	public async getUser(user_id: string): Promise<GetUserResponse> {
		const response = await fetch(`${API_BASE_URL}/user/${user_id}`, {
			credentials: 'include',
			method: 'GET'
		});
		if (!response.ok) {
			throw new Error('Failed to fetch user');
		}
		const user: GetUserResponse = await response.json();
		return user;
	}

	public async updateUser(user: Partial<IUserUpdate>): Promise<IUser> {
		const response = await fetch(`${API_BASE_URL}/user/me`, {
			credentials: 'include',
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(user)
		});
		if (!response.ok) {
			if (response.status === 403) {
				throw new Error('You are not authorized to update this user.');
			}
			throw new Error('Failed to update user');
		}
		const data: IUser = await response.json();
		return data;
	}

	public async deleteUser(): Promise<void> {
		const response = await fetch(`${API_BASE_URL}/user`, {
			credentials: 'include',
			method: 'DELETE'
		});
		if (!response.ok) {
			if (response.status === 403) {
				throw new Error('You are not authorized to delete this user.');
			}
			throw new Error('Failed to delete user');
		}
	}

	public async doesUsernameExist(username: string): Promise<boolean> {
		const response = await fetch(`${API_BASE_URL}/user/username-exists/${username}`, {
			credentials: 'include',
			method: 'GET'
		});
		if (!response.ok) {
			throw new Error('Failed to check username existence');
		}
		const data: { exists: boolean } = await response.json();
		return data.exists;
	}

	public async doesEmailExist(email: string): Promise<boolean> {
		const response = await fetch(`${API_BASE_URL}/user/email-exists/${email}`, {
			credentials: 'include',
			method: 'GET'
		});
		if (!response.ok) {
			throw new Error('Failed to check email existence');
		}
		const data: { exists: boolean } = await response.json();
		return data.exists;
	}
}

export const user_api = new UserAPI();
