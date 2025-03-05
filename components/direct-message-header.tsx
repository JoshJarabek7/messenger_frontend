'use client';

import React from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { CircleUser, MoreHorizontal, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

import { User } from '@/types/app';
import { useUserContext } from '@/hooks/use-user-context';

interface DirectMessageHeaderProps {
  participants: User[];
  conversationId: string;
  organizationSlug: string;
}

function StatusIndicator({ status }: { status: 'online' | 'offline' | 'away' }) {
  return (
    <span
      className={`h-2 w-2 rounded-full ${
        status === 'online' ? 'bg-green-500' : status === 'away' ? 'bg-yellow-500' : 'bg-gray-400'
      }`}
    />
  );
}

export function DirectMessageHeader({
  participants,
  conversationId,
  organizationSlug,
}: DirectMessageHeaderProps) {
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const { userProfiles } = useUserContext();

  const handleDeleteConversation = async () => {
    setIsDeleting(true);
    console.log(`Starting deletion of conversation ${conversationId} in org ${organizationSlug}`);

    try {
      console.log('Sending delete request to API');
      const response = await fetch(`/protected/org/${organizationSlug}/dm/delete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ conversationId }),
      });

      console.log(`API response status: ${response.status}`);
      const result = await response.json();
      console.log('API response data:', result);

      if (result.success && result.redirect) {
        console.log(`Deletion successful, redirecting to ${result.redirect}`);
        toast.success('Conversation deleted successfully');

        try {
          // Try to manually update the UI by removing the conversation from any global state
          // This is a fallback in case realtime events don't propagate properly
          if (typeof window !== 'undefined' && 'removeDirectMessageFromSidebar' in window) {
            console.log('Calling client-side removal function');
            (window as any).removeDirectMessageFromSidebar(conversationId);
          } else {
            console.log('No global removal function found, using direct navigation');
          }
        } catch (err) {
          console.error('Error in client-side cleanup:', err);
        }

        // Force hard navigation without waiting for client-side router
        window.location.href = result.redirect;

        // This is a backup in case window.location doesn't trigger
        setTimeout(() => {
          window.location.replace(result.redirect);
        }, 500);
      } else {
        console.error('API returned error:', result.error);
        toast.error(`Failed to delete conversation: ${result.error || 'Unknown error'}`);
        setDeleteDialogOpen(false);
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast.error('Failed to delete conversation due to an unexpected error');
      setDeleteDialogOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex items-center justify-between border-b px-4 py-3">
      <div className="flex items-center gap-2">
        <div className="flex -space-x-2">
          {participants.slice(0, 3).map(participant => {
            // Get the latest user data from context, falling back to the prop data
            const updatedParticipant = userProfiles[participant.id] || participant;

            return (
              <div
                key={participant.id}
                className="relative rounded-full border-2 border-background"
              >
                {updatedParticipant.avatar_url ? (
                  updatedParticipant.avatar_url.startsWith('data:image/') ? (
                    // Handle base64 images
                    <div
                      className="h-6 w-6 rounded-full bg-cover bg-center"
                      style={{ backgroundImage: `url(${updatedParticipant.avatar_url})` }}
                    />
                  ) : (
                    // Handle normal URLs
                    <Image
                      src={updatedParticipant.avatar_url}
                      alt={updatedParticipant.display_name || updatedParticipant.username}
                      width={24}
                      height={24}
                      className="rounded-full h-6 w-6"
                    />
                  )
                ) : (
                  <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                    <CircleUser className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            );
          })}
          {participants.length > 3 && (
            <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs">
              +{participants.length - 3}
            </div>
          )}
        </div>

        <div className="flex flex-col">
          <h2 className="font-medium">
            {participants
              .map(p => {
                const updatedParticipant = userProfiles[p.id] || p;
                return updatedParticipant.display_name || updatedParticipant.username;
              })
              .join(', ')}
          </h2>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <StatusIndicator
              status={getGroupStatus(
                // Map participants to their updated versions
                participants.map(p => userProfiles[p.id] || p)
              )}
            />
            <span>
              {participants.some(p => (userProfiles[p.id] || p).status === 'online')
                ? 'Online'
                : participants.some(p => (userProfiles[p.id] || p).status === 'away')
                  ? 'Away'
                  : 'Offline'}
            </span>
          </div>
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            className="text-red-600 cursor-pointer"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete conversation
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete the conversation for all participants. Messages will be permanently
              removed. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConversation}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Helper function to determine the status of a group chat
function getGroupStatus(participants: User[]): 'online' | 'away' | 'offline' {
  if (participants.some(p => p.status === 'online')) return 'online';
  if (participants.some(p => p.status === 'away')) return 'away';
  return 'offline';
}
