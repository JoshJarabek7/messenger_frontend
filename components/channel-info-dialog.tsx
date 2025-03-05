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
import { Hash, User, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Channel, ChannelMember } from '@/types/app';
import { createClient } from '@/utils/supabase/client';
import { nullToUndefined } from '@/utils/type-utils';

interface ChannelInfoDialogProps {
  channel: Channel;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChannelInfoDialog({ channel, open, onOpenChange }: ChannelInfoDialogProps) {
  const [members, setMembers] = React.useState<ChannelMember[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchMembers() {
      if (!open) return;

      setLoading(true);
      const supabase = createClient();

      // First get the organization ID for this channel
      const { data: channelData, error: channelError } = await supabase
        .from('channels')
        .select('organization_id')
        .eq('id', channel.id)
        .single();

      if (channelError || !channelData) {
        console.error('Error fetching channel:', channelError);
        setLoading(false);
        return;
      }

      // Then fetch the members of the channel's organization
      const { data, error } = await supabase
        .from('organization_members')
        .select(
          `
          users (
            id,
            username,
            avatar_url,
            email
          ),
          role
        `
        )
        .eq('organization_id', channelData.organization_id);

      if (error) {
        console.error('Error fetching channel members:', error);
      } else if (data) {
        const formattedMembers = data.map(
          member =>
            ({
              id: member.users.id,
              username: member.users.username,
              avatar_url: nullToUndefined(member.users.avatar_url),
              email: member.users.email,
              role: member.role,
            }) as ChannelMember
        );
        setMembers(formattedMembers);
      }

      setLoading(false);
    }

    fetchMembers();
  }, [channel.id, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5" />
            {channel.name}
          </DialogTitle>
          <DialogDescription>
            {channel.description ? channel.description : 'Channel details and members'}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="about">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="about">About</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
          </TabsList>

          <TabsContent value="about" className="space-y-4 pt-4">
            <div>
              <h3 className="text-sm font-medium">Channel Type</h3>
              <p className="text-sm text-muted-foreground">
                {channel.is_public ? 'Public' : 'Private'} Channel
              </p>
            </div>

            <div>
              <h3 className="text-sm font-medium">Created</h3>
              <p className="text-sm text-muted-foreground">
                {/* This would ideally show the creation date */}
                This channel was created recently
              </p>
            </div>
          </TabsContent>

          <TabsContent value="members" className="pt-4">
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Members ({loading ? '...' : members.length})
            </h3>

            {loading ? (
              <div className="text-center py-4 text-muted-foreground">Loading members...</div>
            ) : (
              <ScrollArea className="h-[300px] pr-4 overflow-y-auto">
                <div className="space-y-2 pb-2">
                  {members.map(member => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between rounded-md p-2 hover:bg-muted"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.avatar_url} />
                          <AvatarFallback>
                            {member.username?.substring(0, 2).toUpperCase() || 'U'}
                          </AvatarFallback>
                        </Avatar>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{member.username}</span>
                            {member.role !== 'member' && (
                              <Badge variant="outline" className="text-xs font-normal py-0">
                                {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                              </Badge>
                            )}
                          </div>
                          {member.email && (
                            <p className="text-xs text-muted-foreground">{member.email}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
