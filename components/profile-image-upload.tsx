'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, Upload, X } from 'lucide-react';
import Image from 'next/image';
import { useUserContext } from '@/hooks/use-user-context';

interface ProfileImageUploadProps {
  userId: string;
  existingImageUrl?: string;
  onComplete: (url: string) => void;
}

export default function ProfileImageUpload({
  userId,
  existingImageUrl,
  onComplete,
}: ProfileImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(existingImageUrl || null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { updateUser } = useUserContext(); // Move this to the top level

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (file: File) => {
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (2MB limit)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size should be less than 2MB');
      return;
    }

    // Create preview
    const localPreviewUrl = URL.createObjectURL(file);
    setPreviewUrl(localPreviewUrl);

    // Upload to Supabase
    await uploadImage(file, localPreviewUrl);
  };

  const uploadImage = async (file: File, localPreviewUrl: string) => {
    setIsUploading(true);
    // Using updateUser from component scope instead of hook call inside function
    try {
      const supabase = createClient();

      // Instead of using storage, encode image as a data URL and save to user profile directly
      // This is a workaround for the missing storage bucket
      await new Promise<void>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = async () => {
          try {
            const base64Image = reader.result as string;

            // Update user profile with base64 image
            const { error: updateError } = await supabase
              .from('users')
              .update({ avatar_url: base64Image })
              .eq('id', userId);

            if (updateError) {
              reject(updateError);
              return;
            }

            // Update the user context (will update all components using the context)
            updateUser({ avatar_url: base64Image });

            // Call the completion handler with the base64 URL
            onComplete(base64Image);
            toast.success('Profile picture updated');
            resolve();
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = error => reject(error);
      });
    } catch (error: any) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image: ' + (error.message || 'Unknown error'));

      // Revoke the object URL to avoid memory leaks
      URL.revokeObjectURL(localPreviewUrl);

      // Revert to the previous image if there was one
      setPreviewUrl(existingImageUrl || null);
    } finally {
      setIsUploading(false);
    }
  };

  const clearImage = () => {
    if (previewUrl && previewUrl !== existingImageUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setPreviewUrl(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div
        className={`relative border-2 border-dashed rounded-md p-6 flex flex-col items-center justify-center transition-all ${
          dragActive ? 'border-primary bg-primary/10' : 'border-muted-foreground/25'
        }`}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        {/* Preview image */}
        {previewUrl ? (
          <div className="relative mb-4">
            <div className="w-32 h-32 rounded-full overflow-hidden">
              <Image
                src={previewUrl}
                alt="Profile preview"
                width={128}
                height={128}
                className="object-cover w-full h-full"
              />
            </div>

            {!isUploading && (
              <button
                type="button"
                className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
                onClick={clearImage}
              >
                <X size={16} />
              </button>
            )}
          </div>
        ) : (
          <div className="w-32 h-32 rounded-full bg-muted flex items-center justify-center mb-4">
            <Upload size={48} className="text-muted-foreground" />
          </div>
        )}

        {/* Upload button */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => e.target.files?.[0] && handleFileChange(e.target.files[0])}
        />

        <div className="space-y-2 text-center">
          <p className="text-sm text-muted-foreground">
            Drag & drop or click to upload your profile picture
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...
              </>
            ) : (
              'Select Image'
            )}
          </Button>
        </div>
      </div>

      {/* Help text */}
      <p className="text-xs text-muted-foreground mt-2 text-center">
        Recommended: Square image, max 2MB
      </p>
    </div>
  );
}
