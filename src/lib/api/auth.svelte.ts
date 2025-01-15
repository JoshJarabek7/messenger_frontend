import type { IUser } from '$lib/types/user.svelte';
import { API_BASE_URL } from '$lib/config';

class AuthAPI {
	public async getMe(): Promise<IUser> {
		const response = await fetch(`${API_BASE_URL}/user/me`, {
			credentials: 'include',
			method: 'GET'
		});
		if (!response.ok) {
			throw new Error('Failed to get me.');
		}
		const data: IUser = await response.json();
		return data;
	}

	public async register(
		username: string,
		password: string,
		email: string,
		display_name: string
	): Promise<IUser> {
		const response = await fetch(`${API_BASE_URL}/auth/register`, {
			method: 'POST',

			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				username,
				password,
				email,
				display_name
			})
		});
		if (!response.ok) {
			throw new Error('Failed to register.');
		}
		const data: IUser = await response.json();
		return data;
	}

	public async login(email: string, password: string): Promise<IUser> {
		const response = await fetch(`${API_BASE_URL}/auth/login`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				email,
				password
			})
		});
		if (!response.ok) {
			throw new Error('Failed to login.');
		}
		const data: IUser = await response.json();
		return data;
	}

	public async logout(): Promise<void> {
		const response = await fetch(`${API_BASE_URL}/auth/logout`, {
			credentials: 'include',
			method: 'POST'
		});
		if (!response.ok) {
			throw new Error('Failed to logout.');
		}
	}

	public async uploadFile(file: File): Promise<string> {
		const formData = new FormData();
		formData.append('file', file);

		const response = await fetch(`${API_BASE_URL}/file`, {
			method: 'POST',
			credentials: 'include',
			body: formData
		});

		if (!response.ok) {
			throw new Error('Failed to upload file');
		}

		const data = await response.json();
		return data.id;
	}

	public async refreshToken(): Promise<void> {
		const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
			credentials: 'include',
			method: 'GET'
		});
		if (!response.ok) {
			throw new Error('Failed to refresh token');
		}
	}
}

export const auth_api = new AuthAPI();
