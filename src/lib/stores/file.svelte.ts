import type { IAttachment, ICachedFile } from '$lib/types/file.svelte';

class FileStore {
	static #instance: FileStore;
	private files = new Map<string, ICachedFile>();

	private constructor() {
		this.files = new Map<string, ICachedFile>();
	}

	public static getInstance(): FileStore {
		if (!FileStore.#instance) {
			FileStore.#instance = new FileStore();
		}
		return FileStore.#instance;
	}

	public getFile(id: string) {
		return this.files.get(id);
	}

	public setFile(file: ICachedFile) {
		this.files.set(file.id, file);
	}

	public setFiles(files: ICachedFile[]) {
		files.forEach((file) => this.setFile(file));
	}

	public removeFile(file_id: string) {
		this.files.delete(file_id);
	}
}

export const file_store = FileStore.getInstance();
