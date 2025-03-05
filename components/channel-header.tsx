'use client';

import React, { useEffect, useState } from 'react';
import { Hash, Info, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChannelInfoDialog } from '@/components/channel-info-dialog';
import { useUserContext } from '@/hooks/use-user-context';

import { Channel as AppChannel } from '@/types/app';

interface Channel extends AppChannel {}

interface ChannelHeaderProps {
  channel: Channel;
  isMember?: boolean;
  memberCount?: number;
}

export function ChannelHeader({ channel }: ChannelHeaderProps) {
  const [infoDialogOpen, setInfoDialogOpen] = React.useState(false);

  return (
    <>
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Hash className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-medium">{channel.name}</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1"
            onClick={() => setInfoDialogOpen(true)}
          >
            <Info className="h-4 w-4 mr-1" />
            <span>Channel Info</span>
          </Button>
        </div>
      </div>

      <ChannelInfoDialog channel={channel} open={infoDialogOpen} onOpenChange={setInfoDialogOpen} />
    </>
  );
}
