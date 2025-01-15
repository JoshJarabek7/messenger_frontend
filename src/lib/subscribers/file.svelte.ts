import { buildFile, unbuildFile } from '$lib/helpers.svelte';
import { file_store } from '$lib/stores/file.svelte';

export async function fileUpdated(file_id: string) {
	const file = file_store.getFile(file_id);
	if (!file) {
		await buildFile(file_id);
	} else {
		// If the file content has changed, we need to rebuild it
		unbuildFile(file_id);
		await buildFile(file_id);
	}
}

export async function fileDeleted(file_id: string) {
	unbuildFile(file_id);
}
