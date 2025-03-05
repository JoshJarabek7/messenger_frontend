'use client';

import React, { useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { updateUserStatus, generateUserEmbeddings } from '@/utils/utils';
import ProfileImageUpload from '@/components/profile-image-upload';

interface ProfileFormProps {
  profile: {
    id: string;
    username: string;
    display_name?: string;
    email: string;
    bio?: string;
    ai_persona_prompt?: string;
    avatar_url?: string;
  };
}

export default function ProfileForm({ profile }: ProfileFormProps) {
  const [displayName, setDisplayName] = useState(profile.display_name || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [aiPersonaPrompt, setAiPersonaPrompt] = useState(profile.ai_persona_prompt || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from('users')
        .update({
          display_name: displayName,
          bio,
          ai_persona_prompt: aiPersonaPrompt,
        })
        .eq('id', profile.id);

      if (error) {
        throw error;
      }

      // Generate updated embeddings for vector search - this is critical for user searchability
      try {
        console.log('Generating user embeddings for profile changes');
        const embedResult = await generateUserEmbeddings(
          profile.id,
          profile.username,
          displayName,
          bio
        );

        if (embedResult) {
          console.log('Successfully updated user embeddings for profile changes');
        } else {
          // If embedding generation fails, show an error but don't roll back profile changes
          // since they're already saved and embedding is secondary
          toast.error('Partial update', {
            description: 'Profile information was saved, but search functionality may be limited.',
          });
        }
      } catch (embedError) {
        console.error('Error updating user embeddings:', embedError);
        // Show error to user but don't roll back profile changes
        toast.error('Partial update', {
          description: 'Profile information was saved, but search functionality may be limited.',
        });
      }

      toast.success('Profile updated', {
        description: 'Your profile has been successfully updated.',
      });
    } catch (error: any) {
      toast.error('Error updating profile', {
        description: error.message || 'Something went wrong',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProfileImageUpdate = (url: string) => {
    // This will be called when the profile image is successfully updated
    // In a production app, you might want to refresh the user's profile data
    // For now, we'll just show a toast notification
    toast.success('Profile image updated successfully');
  };

  return (
    <div className="text-card-foreground">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="mb-8 flex flex-col items-center">
          <h3 className="text-lg font-medium mb-4">Profile Picture</h3>
          <ProfileImageUpload
            userId={profile.id}
            existingImageUrl={profile.avatar_url}
            onComplete={handleProfileImageUpdate}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input id="username" value={profile.username} disabled className="bg-muted" />
          <p className="text-xs text-muted-foreground">Username cannot be changed</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={profile.email} disabled className="bg-muted" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="displayName">Display Name</Label>
          <Input
            id="displayName"
            value={displayName}
            onChange={e => setDisplayName(e.target.value)}
            placeholder="How you want to be called"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={e => setBio(e.target.value)}
            placeholder="Tell us a bit about yourself"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="aiPersona">AI Avatar Persona</Label>
          <Textarea
            id="aiPersona"
            value={aiPersonaPrompt}
            onChange={e => setAiPersonaPrompt(e.target.value)}
            placeholder="Describe how your AI avatar should respond when you're away"
            rows={5}
          />
          <p className="text-xs text-muted-foreground">
            This prompt will guide how your AI avatar responds to mentions when you're offline. Be
            specific about your communication style, topics you're knowledgeable about, and how you
            typically respond.
          </p>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
  );
}
