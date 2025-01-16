import type { StringValidation } from 'zod';

export interface IAttachment {
	id: string;
	file_name?: string;
	file_type?: string;
	file_size?: number;
}

export interface ICachedFile extends IAttachment {
	file_blob: Blob;
}
