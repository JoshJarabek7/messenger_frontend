'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Settings } from 'lucide-react';
import ProfileForm from '@/components/profile-form';
import { createClient } from '@/utils/supabase/client';
import { useEffect, useState } from 'react';

interface UserSettingsDialogProps {
  userId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserSettingsDialog({ userId, open, onOpenChange }: UserSettingsDialogProps) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      if (!open || !userId) return;

      setLoading(true);
      const supabase = createClient();

      const { data, error } = await supabase.from('users').select('*').eq('id', userId).single();

      if (error) {
        console.error('Error fetching user profile:', error);
      } else if (data) {
        setProfile(data);
      }

      setLoading(false);
    }

    fetchProfile();
  }, [userId, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Settings className="h-5 w-5" />
            User Settings
          </DialogTitle>
          <DialogDescription>Manage your profile and application preferences</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="profile" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="preferences" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Preferences
            </TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="py-4">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading profile...</div>
            ) : profile ? (
              <ProfileForm profile={profile} />
            ) : (
              <div className="text-center py-8 text-muted-foreground">Could not load profile</div>
            )}
          </TabsContent>

          <TabsContent value="preferences" className="py-4">
            <div className="text-center py-8 text-muted-foreground">
              Preferences settings coming soon
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
