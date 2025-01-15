import { API_BASE_URL } from '$lib/config';
import type { ICachedFile } from '$lib/types/file.svelte';

interface IGetPresignedURLResponse {
	s3_url: string;
}

class FileAPI {
	public async getFileInfo(file_id: string) {
		const response = await fetch(`${API_BASE_URL}/files/${file_id}`, {
			credentials: 'include',
			method: 'GET'
		});
		if (!response.ok) {
			throw new Error('Failed to get file info');
		}
		const data: ICachedFile = await response.json();
		return data;
	}

	public async getPresignedURL(file_id: string): Promise<string | null> {
		const response = await fetch(`${API_BASE_URL}/files/${file_id}/download`, {
			credentials: 'include',
			method: 'GET'
		});
		if (!response.ok) {
			return null;
		}
		const data: IGetPresignedURLResponse = await response.json();
		return data.s3_url;
	}

	public async getFileBlob(file_id: string): Promise<Blob | null> {
		const presigned_url = await this.getPresignedURL(file_id);
		if (!presigned_url) {
			throw new Error('Failed to get presigned URL');
		}
		const response = await fetch(presigned_url, {
			credentials: 'include',
			method: 'GET'
		});
		if (!response.ok) {
			throw new Error('Failed to get file blob from presigned URL');
		}
		const blob = await response.blob();
		return blob;
	}

	public async uploadFile(file: File): Promise<ICachedFile> {
		const formData = new FormData();
		formData.append('file', file);

		const response = await fetch(`${API_BASE_URL}/files`, {
			method: 'POST',
			credentials: 'include',
			body: formData
		});

		if (!response.ok) {
			throw new Error('Failed to upload file');
		}

		const data: ICachedFile = await response.json();
		return data;
	}

	public async deleteFile(file_id: string): Promise<void> {
		const response = await fetch(`${API_BASE_URL}/files/${file_id}`, {
			method: 'DELETE',
			credentials: 'include'
		});
		if (!response.ok) {
			throw new Error('Failed to delete file');
		}
	}
}

export const file_api = new FileAPI();
