import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Hash, Plus, ChevronDown, Users, MessageSquare, Settings, CircleUser } from 'lucide-react';
import { CreateChannelDialog } from '@/components/create-channel-dialog';
import { CreateDMDialog } from '@/components/create-dm-dialog';
import { JoinOrganizationDialog } from '@/components/join-organization-dialog';

interface Organization {
  id: string;
  name: string;
  slug: string;
  avatar_url?: string;
}

interface Channel {
  id: string;
  name: string;
  slug: string;
  description?: string;
  is_public: boolean;
}

interface User {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  status: 'online' | 'offline' | 'away';
}

interface DirectMessage {
  conversationId: string;
  users: User[];
}

interface SidebarProps {
  user: User;
  currentOrganization: Organization;
  organizations: Organization[];
  channels: Channel[];
  directMessages: DirectMessage[];
}

function StatusIndicator({ status }: { status: 'online' | 'offline' | 'away' }) {
  return (
    <span
      className={cn(
        'absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background',
        status === 'online' && 'bg-green-500',
        status === 'away' && 'bg-yellow-500',
        status === 'offline' && 'bg-gray-400'
      )}
    />
  );
}

function UserAvatar({ user }: { user: User }) {
  return (
    <div className="relative h-9 w-9">
      {user.avatar_url ? (
        <Image
          src={user.avatar_url}
          alt={user.display_name || user.username}
          className="rounded-full"
          width={36}
          height={36}
        />
      ) : (
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent text-accent-foreground">
          <CircleUser size={24} />
        </div>
      )}
      <StatusIndicator status={user.status} />
    </div>
  );
}

export default function Sidebar({
  user,
  currentOrganization,
  organizations,
  channels,
  directMessages,
}: SidebarProps) {
  return (
    <div className="flex h-full w-64 flex-col bg-card text-card-foreground border-r">
      <div className="flex items-center justify-between border-b p-4">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded-md flex items-center justify-center bg-primary text-primary-foreground mr-2">
            {currentOrganization.avatar_url ? (
              <Image
                src={currentOrganization.avatar_url}
                alt={currentOrganization.name}
                className="rounded-md"
                width={24}
                height={24}
              />
            ) : (
              <Users size={16} />
            )}
          </div>
          <span className="font-semibold">{currentOrganization.name}</span>
        </div>
        <button className="rounded-md p-1 hover:bg-accent transition-colors">
          <Settings size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-6">
          <div className="flex items-center justify-between px-2 py-2">
            <h3 className="text-xs font-medium uppercase text-muted-foreground tracking-wider">
              Channels
            </h3>
            <CreateChannelDialog
              organizationId={currentOrganization.id}
              organizationSlug={currentOrganization.slug}
              trigger={
                <button className="rounded-md p-1 hover:bg-accent transition-colors">
                  <Plus size={16} />
                </button>
              }
            />
          </div>
          <div className="mt-1 space-y-1">
            {channels.map(channel => (
              <Link
                key={channel.id}
                href={`/protected/org/${currentOrganization.slug}/channel/${channel.slug}`}
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
              >
                <Hash size={16} />
                <span>{channel.name}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between px-2 py-2">
            <h3 className="text-xs font-medium uppercase text-muted-foreground tracking-wider">
              Direct Messages
            </h3>
            <CreateDMDialog
              organizationId={currentOrganization.id}
              organizationSlug={currentOrganization.slug}
              currentUserId={user.id}
              trigger={
                <button className="rounded-md p-1 hover:bg-accent transition-colors">
                  <Plus size={16} />
                </button>
              }
            />
          </div>
          <div className="mt-1 space-y-1">
            {directMessages.map(dm => (
              <Link
                key={dm.conversationId}
                href={`/protected/org/${currentOrganization.slug}/dm/${dm.conversationId}`}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
              >
                {dm.users.length > 0 && (
                  <>
                    <div className="relative h-6 w-6 flex-shrink-0">
                      {dm.users[0].avatar_url ? (
                        <Image
                          src={dm.users[0].avatar_url}
                          alt={dm.users[0].display_name || dm.users[0].username}
                          className="rounded-full"
                          width={24}
                          height={24}
                        />
                      ) : (
                        <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                          <CircleUser size={16} />
                        </div>
                      )}
                      <span
                        className={cn(
                          'absolute bottom-0 right-0 h-2 w-2 rounded-full border border-card',
                          dm.users[0].status === 'online' && 'bg-green-500',
                          dm.users[0].status === 'away' && 'bg-yellow-500',
                          dm.users[0].status === 'offline' && 'bg-gray-400'
                        )}
                      />
                    </div>
                    <span className="truncate">
                      {dm.users[0].display_name || dm.users[0].username}
                    </span>
                  </>
                )}
              </Link>
            ))}
          </div>
        </div>

        {organizations.length > 1 && (
          <div className="mb-6 pt-2 border-t">
            <h3 className="px-2 py-2 text-xs font-medium uppercase text-muted-foreground tracking-wider">
              Organizations
            </h3>
            <div className="mt-1 space-y-1">
              {organizations
                .filter(org => org.id !== currentOrganization.id)
                .map(org => (
                  <Link
                    key={org.id}
                    href={`/protected/org/${org.slug}`}
                    className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
                  >
                    <div className="w-6 h-6 rounded-md flex items-center justify-center bg-muted flex-shrink-0">
                      {org.avatar_url ? (
                        <Image
                          src={org.avatar_url}
                          alt={org.name}
                          className="rounded-md"
                          width={24}
                          height={24}
                        />
                      ) : (
                        <Users size={16} />
                      )}
                    </div>
                    <span className="truncate">{org.name}</span>
                  </Link>
                ))}
              <div className="mt-2 pt-2 border-t border-muted/40 space-y-1">
                <Link
                  href="/protected"
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors"
                >
                  <div className="w-6 h-6 rounded-md flex items-center justify-center bg-muted flex-shrink-0">
                    <Plus size={16} />
                  </div>
                  <span>Create Organization</span>
                </Link>
                <JoinOrganizationDialog
                  userId={user.id}
                  trigger={
                    <div className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-accent transition-colors cursor-pointer">
                      <div className="w-6 h-6 rounded-md flex items-center justify-center bg-muted flex-shrink-0">
                        <Users size={16} />
                      </div>
                      <span>Join Organization</span>
                    </div>
                  }
                />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="border-t p-4">
        <Link
          href="/protected/profile"
          className="flex items-center gap-3 rounded-md p-2 hover:bg-accent transition-colors"
        >
          <UserAvatar user={user} />
          <div className="overflow-hidden">
            <p className="text-sm font-medium truncate">{user.display_name || user.username}</p>
            <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
