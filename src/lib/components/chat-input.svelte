<script lang="ts">
    import * as Button from "$lib/components/ui/button";
    import { PaperPlaneRight, PaperclipHorizontal } from "phosphor-svelte";
    import { createEventDispatcher } from "svelte";
    import { FileAPI } from "$lib/api/files";

    // File validation constants
    const ALLOWED_MIME_TYPES: readonly string[] = [
        'image/',
        'video/',
        'audio/',
        'application/pdf',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation'
    ] as const;

    const MAX_FILE_SIZE: number = 100 * 1024 * 1024; // 100MB

    const dispatch = createEventDispatcher<{
        submit: { content: string; fileIds?: string[] };
    }>();

    let message = $state("");
    // let file = $state<(File & { id?: string }) | null>(null);
    let isUploading = $state(false);
    let file: FileList | null = $state(null);

    // Track file state changes
    // $effect(() => {
    //     console.log('file state updated:', file);
    // });

    // function isValidFile(file: File): boolean {
    //     // Check file size
    //     if (file.size > MAX_FILE_SIZE) {
    //         alert(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`);
    //         return false;
    //     }

    //     // Check mime type
    //     const isValidType = ALLOWED_MIME_TYPES.some((type: string) => file.type.startsWith(type));
    //     if (!isValidType) {
    //         alert('Invalid file type. Please upload images, videos, audio, or documents.');
    //         return false;
    //     }

    //     return true;
    // }

    // async function handlefileelect(event: Event) {
    //     console.log('handlefileelect called');
    //     const input = event.target as HTMLInputElement;
    //     console.log('input:', input);
    //     return;
    //     if (!input.file?.length) return;

    //     const fileList = Array.from(input.file);
    //     console.log('file selected before validation:', fileList);
    //     const newfile = fileList.filter(isValidFile);
    //     console.log('file after validation:', newfile);

    //     if (!newfile.length) {
    //         console.warn('No valid file to upload');
    //         return;
    //     }

    //     // Don't update file state here since bind:value will handle it
    //     console.log('file selected:', newfile);
    // }

    async function uploadfile(): Promise<string[]> {
        // const file = $state.snapshot(file);
        if (!file) {
            console.log('No file to upload');
            return [];
        }


        console.log('Starting upload for file:', file[0].name, 'Length:', file[0].size);
        isUploading = true;
        const fileIds: string[] = [];

        try {

            if (!file[0].name || !file[0].type) {
                console.error('Invalid file object:', file);
            }

            console.log('Uploading file:', file[0].name, 'Type:', file[0].type, 'Size:', file[0].size);
            
            const uploadDetails = await FileAPI.getUploadUrl(file[0].name, file[0].type);
            console.log('Got upload URL for:', file[0].name, 'Details:', uploadDetails);
            console.log('File ID from response:', uploadDetails.metadata.file_id);
            
            const formData = new FormData();
            Object.entries(uploadDetails.upload_data.fields).forEach(([key, value]) => {
                formData.append(key, value as string);
            });
            formData.append('file', file[0]);

            console.log('Uploading to S3...');
            const uploadResponse = await fetch(uploadDetails.upload_data.url, {
                method: 'POST',
                body: formData
            });

            if (!uploadResponse.ok) {
                const error = await uploadResponse.text();
                console.error('Upload failed:', error);
                throw new Error(`Failed to upload file ${file[0].name}`);
            }

            console.log('Confirming upload with backend...');
            console.log('Using file ID:', uploadDetails.metadata.file_id);
            const fileData = await FileAPI.confirmUpload(
                uploadDetails.metadata.file_id,
                file[0].size
            );
            console.log('Upload confirmed for:', file[0].name, 'ID:', fileData.id);
            fileIds.push(fileData.id);


            return fileIds;
        } catch (error) {
            console.error('Error in uploadfile:', error);
            throw error;
        } finally {
            isUploading = false;
        }
    }

    async function handleSubmit() {
        const currentMessage = message.trim();
        
        // Don't submit if there's no message and no file
        if (!currentMessage && !file) return;
        
        try {
            let fileIds: string[] = [];
            
            // Upload file if present
            if (file) {
                fileIds = await uploadfile();
                console.log('File uploaded successfully, IDs:', fileIds);
            }
            
            // Dispatch the message with optional file IDs
            dispatch('submit', { 
                content: currentMessage, 
                fileIds: fileIds.length > 0 ? fileIds : undefined 
            });
            
            // Only clear after successful upload and dispatch
            message = "";
            file = null;
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Failed to send message. Please try again.');
        }
    }

    function handleKeyDown(event: KeyboardEvent) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleSubmit();
        }
    }

    function removeFile(index: number) {
        file = null;
    }

</script>

<div class="flex flex-col gap-2">
    <form class="flex items-center gap-3" onsubmit={handleSubmit}>
        <div class="flex-1">
            <input
                type="text"
                placeholder="Type a message..."
                bind:value={message}
                onkeydown={handleKeyDown}
                class="h-11 w-full px-4 rounded-md border bg-background text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
        </div>
        
        <div class="flex items-center gap-2">
            <div class="relative">
                <input 
                    type="file"
                    id="file-input"
                    bind:files={file}
                />
            </div>
        </div>
        <Button.Root type="submit" size="icon" variant="default" class="h-11 w-11">
            <PaperPlaneRight weight="bold" class="h-5 w-5" />
        </Button.Root>
    </form>
</div> 