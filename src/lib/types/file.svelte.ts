import type { StringValidation } from 'zod';

export interface IAttachment {
	id: string;
	file_name?: string;
	file_type?: string;
	file_size?: number;
}

export interface ICachedFile {
	id: string; // The id will be the s3_key
	file_name?: string;
	file_type?: string;
	file_size?: number;
	file_blob?: Blob;
}
