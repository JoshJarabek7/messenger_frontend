import type { IAttachment, ICachedFile } from '$lib/types/file.svelte';
import { SvelteMap } from 'svelte/reactivity';

class FileStore {
	static #instance: FileStore;
	private files = $state<SvelteMap<string, ICachedFile>>(new SvelteMap());

	public static getInstance(): FileStore {
		if (!FileStore.#instance) {
			FileStore.#instance = new FileStore();
		}
		return FileStore.#instance;
	}

	private cleanFileId(id: string): string {
		if (!id) return id;

		try {
			// If it's a URL, try to extract just the UUID
			if (id.startsWith('http')) {
				// First split by '/' to get path components
				const parts = id.split('/');
				// Get the last part and remove query parameters
				const lastPart = parts[parts.length - 1];
				// Get everything before the first question mark
				const uuid = lastPart.split('?')[0];

				// Decode until we can't decode anymore
				let decoded = uuid;
				while (true) {
					const newDecoded = decodeURIComponent(decoded);
					if (newDecoded === decoded) {
						break;
					}
					decoded = newDecoded;
				}
				return decoded;
			}

			// If it's not a URL, just decode it
			let decoded = id;
			// Remove any query parameters first
			decoded = decoded.split('?')[0];
			while (true) {
				const newDecoded = decodeURIComponent(decoded);
				if (newDecoded === decoded) {
					break;
				}
				decoded = newDecoded;
			}
			return decoded;
		} catch (error) {
			console.error('Error cleaning file ID:', {
				original: id,
				error
			});
			return id;
		}
	}

	public getFile(id: string): ICachedFile | null {
		if (!id) return null;

		const cleanId = this.cleanFileId(id);
		return this.files.get(cleanId) ?? null;
	}

	public setFile(file: ICachedFile): void {
		if (!file.id) {
			console.error('Attempted to store file without ID:', file);
			return;
		}

		if (!file.file_blob) {
			console.error('Attempted to store file without blob:', file.id);
			return;
		}

		const cleanId = this.cleanFileId(file.id);
		file.id = cleanId;  // Update the file's ID to the clean version


		this.files.set(cleanId, file);
	}

	public setFiles(files: ICachedFile[]): void {
		files.forEach((file) => this.setFile(file));
	}

	public removeFile(file_id: string): void {
		const cleanId = this.cleanFileId(file_id);
		this.files.delete(cleanId);
	}
}

export const file_store = FileStore.getInstance();
