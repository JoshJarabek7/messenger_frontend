import type { FileAttachment } from '$lib/types';
import { API_BASE_URL } from '$lib/config.ts';
interface UploadDetails {
    upload_data: {
        url: string;
        fields: Record<string, string>;
    };
    metadata: {
        s3_key: string;
        mime_type: string;
        original_filename: string;
        file_id: string;
    };
}

export class FileAPI {
    static async getUploadUrl(filename: string, contentType: string): Promise<UploadDetails> {
        const params = new URLSearchParams({
            filename: encodeURIComponent(filename),
            content_type: contentType
        });

        try {
            const response = await fetch(`${API_BASE_URL}/files/upload-url?${params}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            if (!response.ok) {
                const error = await response.json();
                console.error('Upload URL error:', error);
                if (error.detail) {
                    throw new Error(`Failed to get upload URL: ${error.detail}`);
                }
                throw new Error('Failed to get upload URL');
            }

            const data = await response.json();
            console.log('Upload URL response:', data);
            return data;
        } catch (error) {
            console.error('Upload URL request failed:', error);
            throw error;
        }
    }

    static async confirmUpload(fileId: string, fileSize: number): Promise<FileAttachment> {
        console.log('Confirming upload with fileId:', fileId, 'size:', fileSize);
        const response = await fetch(`${API_BASE_URL}/files/complete-upload/${fileId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                file_size: fileSize
            })
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('Confirm upload error:', error);
            throw new Error('Failed to confirm upload');
        }

        return response.json();
    }

    static async getDownloadUrl(fileId: string): Promise<string> {
        const response = await fetch(`${API_BASE_URL}/files/${fileId}/download`, {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to get download URL');
        }

        const data = await response.json();
        return data.download_url;
    }

    static async delete(fileId: string): Promise<void> {
        const response = await fetch(`${API_BASE_URL}/files/${fileId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to delete file');
        }
    }
}