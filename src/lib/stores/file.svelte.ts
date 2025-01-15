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

	public getFile(id: string): ICachedFile | null {
		return this.files.get(id) ?? null;
	}

	public setFile(file: ICachedFile): void {
		this.files.set(file.id, file);
	}

	public setFiles(files: ICachedFile[]): void {
		files.forEach((file) => this.setFile(file));
	}

	public removeFile(file_id: string): void {
		this.files.delete(file_id);
	}
}

export const file_store = FileStore.getInstance();
