import type { FileAttachment } from '$lib/types';

export class FileAPI {
    static async upload(
        file: File,
        workspaceId?: string,
        conversationId?: string
    ): Promise<FileAttachment> {
        const formData = new FormData();
        formData.append('file', file);
        
        if (workspaceId) {
            formData.append('workspace_id', workspaceId);
        }
        if (conversationId) {
            formData.append('conversation_id', conversationId);
        }

        const response = await fetch('http://localhost:8000/api/files/upload', {
            method: 'POST',
            credentials: 'include',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Failed to upload file');
        }

        return response.json();
    }

    static async uploadMultiple(
        files: File[],
        workspaceId?: string,
        conversationId?: string
    ): Promise<FileAttachment[]> {
        const formData = new FormData();
        files.forEach(file => formData.append('files', file));
        
        if (workspaceId) {
            formData.append('workspace_id', workspaceId);
        }
        if (conversationId) {
            formData.append('conversation_id', conversationId);
        }

        const response = await fetch('http://localhost:8000/api/files/upload-multiple', {
            method: 'POST',
            credentials: 'include',
            body: formData
        });

        if (!response.ok) {
            throw new Error('Failed to upload files');
        }

        return response.json();
    }

    static async get(fileId: string): Promise<FileAttachment> {
        const response = await fetch(`http://localhost:8000/api/files/${fileId}`, {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to fetch file');
        }

        return response.json();
    }

    static async delete(fileId: string): Promise<void> {
        const response = await fetch(`http://localhost:8000/api/files/${fileId}`, {
            method: 'DELETE',
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to delete file');
        }
    }

    static async getDownloadUrl(fileId: string): Promise<string> {
        const response = await fetch(`http://localhost:8000/api/files/${fileId}/download`, {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to get download URL');
        }

        const data = await response.json();
        return data.download_url;
    }

    static async getPreviewUrl(fileId: string): Promise<string> {
        const response = await fetch(`http://localhost:8000/api/files/${fileId}/preview`, {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to get preview URL');
        }

        const data = await response.json();
        return data.preview_url;
    }

    static async getByConversation(conversationId: string): Promise<FileAttachment[]> {
        const response = await fetch(`http://localhost:8000/api/files?conversation_id=${conversationId}`, {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to fetch conversation files');
        }

        return response.json();
    }

    static async getByWorkspace(workspaceId: string): Promise<FileAttachment[]> {
        const response = await fetch(`http://localhost:8000/api/files?workspace_id=${workspaceId}`, {
            credentials: 'include'
        });

        if (!response.ok) {
            throw new Error('Failed to fetch workspace files');
        }

        return response.json();
    }
} 