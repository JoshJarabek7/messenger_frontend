'use client';

import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Hash, Plus, Users, CircleUser, LogOut, Settings } from 'lucide-react';
import { Database } from '@/types/supabase';
import { CreateChannelDialog } from '@/components/create-channel-dialog';
import { CreateDMDialog } from '@/components/create-dm-dialog';
import { CreateOrganizationDialog } from '@/components/create-organization-dialog';
import { JoinOrganizationDialog } from '@/components/join-organization-dialog';
import { UserSettingsDialog } from '@/components/user-settings-dialog';
import { signOutAction } from '@/app/actions';
import { useState, useEffect, useRef } from 'react';
import { useUserContext } from '@/hooks/use-user-context';
import { createClient } from '@/utils/supabase/client';

import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarFooter,
} from '@/components/ui/sidebar';
import NextLink from 'next/link';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

import { Organization, Channel, User } from '@/types/app';
import { nullToUndefined } from '@/utils/type-utils';

export interface DirectMessage {
  conversationId: string;
  organizationId: string; // Add organization ID to track which org this DM belongs to
  users: User[];
}

interface SidebarProps {
  user: User;
  currentOrganization: Organization | null;
  organizations: Organization[];
  channels: Channel[];
  directMessages: DirectMessage[];
}

function StatusIndicator({ status }: { status: 'online' | 'offline' | 'away' }) {
  return (
    <span
      className={cn(
        'absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border border-background',
        status === 'online' && 'bg-green-500',
        status === 'away' && 'bg-yellow-500',
        status === 'offline' && 'bg-gray-400'
      )}
    />
  );
}

function UserAvatar({ user }: { user: User }) {
  // Get the current user from context which will update in real-time
  const { currentUser } = useUserContext();

  // Use context user if it's the same user, otherwise use passed user (for other users in DMs)
  const displayUser = currentUser && currentUser.id === user.id ? currentUser : user;

  // Check if the avatar URL is a base64 string
  const isBase64 = displayUser.avatar_url?.startsWith('data:image/');

  return (
    <div className="relative flex-shrink-0">
      {displayUser.avatar_url ? (
        isBase64 ? (
          // Handle base64 images
          <div
            className="h-8 w-8 rounded-full bg-cover bg-center"
            style={{ backgroundImage: `url(${displayUser.avatar_url})` }}
          />
        ) : (
          // Handle normal URLs
          <Image
            src={displayUser.avatar_url}
            alt={displayUser.display_name || displayUser.username}
            className="rounded-full"
            width={32}
            height={32}
          />
        )
      ) : (
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-accent">
          <CircleUser className="h-5 w-5" />
        </div>
      )}
      <StatusIndicator
        status={(displayUser.status as 'online' | 'offline' | 'away') || 'offline'}
      />
    </div>
  );
}

export default function ShadcnSidebar({
  user,
  currentOrganization,
  organizations,
  channels: initialChannels,
  directMessages,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [channels, setChannels] = useState<Channel[]>(initialChannels);
  const [dms, setDMs] = useState<DirectMessage[]>(directMessages);
  // Initialize open organizations from localStorage if available
  const [openOrgs, setOpenOrgs] = useState<string[]>(() => {
    // Only run in browser environment
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('chatgenius-open-orgs');
        const parsed = saved ? JSON.parse(saved) : [];

        // Always include current organization if available
        if (currentOrganization && !parsed.includes(currentOrganization.id)) {
          parsed.push(currentOrganization.id);
        }

        return parsed;
      } catch (e) {
        console.error('Error loading open orgs from localStorage:', e);
      }
    }

    // Default to just the current organization if localStorage fails or we're server-side
    return currentOrganization ? [currentOrganization.id] : [];
  });
  const supabaseClientRef = useRef<any>(null);
  const channelSubscriptionRef = useRef<any>(null);
  const dmSubscriptionRef = useRef<any>(null);
  const orgSubscriptionRef = useRef<any>(null);
  // Used to track if we've already auto-expanded the current org
  const currentOrgAutoExpandedRef = useRef<boolean>(false);

  // Initialize Supabase client and preload data
  useEffect(() => {
    if (!supabaseClientRef.current) {
      supabaseClientRef.current = createClient();
    }

    // Always preload all DMs regardless of which organization is selected
    preloadAllOrganizationData();

    // Add a global function to manually remove conversations
    // This is used as a fallback when real-time events fail
    if (typeof window !== 'undefined') {
      (window as any).removeDirectMessageFromSidebar = (conversationId: string) => {
        console.log(`Manual removal of conversation ${conversationId} from sidebar`);
        setDMs(prev => {
          const newDms = prev.filter(dm => dm.conversationId !== conversationId);
          console.log(`Removed conversation (manual): ${prev.length} -> ${newDms.length}`);
          return newDms;
        });
      };
    }

    return () => {
      // Clean up global function on unmount
      if (typeof window !== 'undefined') {
        delete (window as any).removeDirectMessageFromSidebar;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // Include user.id as dependency since we need it for DM preloading

  // Function to preload channels for organizations the user is a member of, and all DMs
  const preloadAllOrganizationData = async () => {
    if (!supabaseClientRef.current || !user?.id) return;

    const supabase = supabaseClientRef.current;
    const userId = user.id;

    try {
      console.log('Preloading channels for user organizations...');

      // First get the organizations the user is a member of
      const { data: userOrgs, error: orgsError } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', userId);

      if (orgsError) {
        console.error('Error fetching user organizations:', orgsError);
        return;
      }

      if (!userOrgs || userOrgs.length === 0) {
        console.log('User is not a member of any organizations');
        setChannels([]);
        return;
      }

      // Extract organization IDs
      const orgIds = userOrgs.map((org: { organization_id: string }) => org.organization_id);

      // Load channels only for organizations the user is a member of
      const { data: userChannels, error: channelsError } = await supabase
        .from('channels')
        .select('*')
        .in('organization_id', orgIds)
        .order('name');

      if (channelsError) {
        console.error('Error preloading channels:', channelsError);
      } else if (userChannels) {
        console.log(`Preloaded ${userChannels.length} channels for user's organizations`);
        setChannels(userChannels);
      }

      // Now load direct message conversations for the user
      if (user?.id) {
        console.log('Preloading direct messages for all organizations...');
        const { data: userDmData, error: dmsError } = await supabase
          .from('direct_message_participants')
          .select(
            `
            conversation:direct_message_conversations (id, organization_id),
            participants:direct_message_conversations!inner(
              direct_message_participants!inner(
                user:users(id, username, display_name, avatar_url, status)
              )
            )
          `
          )
          .eq('user_id', user.id);

        if (dmsError) {
          console.error('Error preloading DMs:', dmsError);
        } else if (userDmData) {
          // Process the DM data
          const userDms = userDmData
            .map((dm: any) => {
              // Ensure dm.participants exists and has the expected structure
              if (!dm.participants || !dm.participants.direct_message_participants) {
                return {
                  conversationId: dm.conversation ? dm.conversation.id : '',
                  organizationId: dm.conversation ? dm.conversation.organization_id : '',
                  users: [],
                };
              }

              // Filter the direct message participants to get only other users
              const directMessageParticipants = dm.participants?.direct_message_participants || [];
              const otherParticipants = directMessageParticipants
                .filter((p: any) => p.user && p.user.id !== user.id)
                .map(
                  (p: any) =>
                    ({
                      id: p.user.id,
                      username: p.user.username,
                      display_name: nullToUndefined(p.user.display_name),
                      avatar_url: nullToUndefined(p.user.avatar_url),
                      status: (p.user.status as User['status']) || 'offline',
                      email: '', // Required by User type but may not be in the response
                      created_at: '',
                      updated_at: '',
                    }) as User
                );

              return {
                conversationId: dm.conversation ? dm.conversation.id : '',
                organizationId: dm.conversation ? dm.conversation.organization_id : '',
                users: otherParticipants,
              };
            })
            .filter((dm: any) => dm.conversationId && dm.users.length > 0);

          console.log(`Preloaded ${userDms.length} direct message conversations`);
          setDMs(userDms);
        }
      }
    } catch (error) {
      console.error('Error preloading organization data:', error);
    }
  };

  // Subscribe to channel changes for real-time updates - only for organizations the user is in
  useEffect(() => {
    if (!supabaseClientRef.current || !user?.id) return;

    const supabase = supabaseClientRef.current;
    const userId = user.id;

    // Clean up previous subscription if it exists
    if (channelSubscriptionRef.current) {
      supabase.removeChannel(channelSubscriptionRef.current);
      channelSubscriptionRef.current = null;
    }

    // First get the user's organizations to set up channel subscriptions
    const fetchUserOrgsAndSetupSubscription = async () => {
      try {
        // Get organizations the user is a member of
        const { data: userOrgs, error: orgsError } = await supabase
          .from('organization_members')
          .select('organization_id')
          .eq('user_id', userId);

        if (orgsError || !userOrgs || userOrgs.length === 0) {
          console.log('No organizations to subscribe to channel changes for');
          return;
        }

        // Extract organization IDs
        const orgIds = userOrgs.map((org: { organization_id: string }) => org.organization_id);
        console.log(
          `User is member of ${orgIds.length} organizations, setting up channel subscriptions`
        );

        // Continue with subscription setup
        setupChannelSubscription(orgIds);
      } catch (error) {
        console.error('Error setting up channel subscriptions:', error);
      }
    };

    // Create a new subscription for the user's organizations
    const setupChannelSubscription = (orgIds: string[]) => {
      const channelName = `user-${userId}-channels-${Date.now()}`;
      const channel = supabase.channel(channelName);

      // Define event handlers first
      const handleNewChannel = (payload: any) => {
        console.log('Channel created:', payload);
        if (payload.new) {
          // Only process if the channel belongs to one of the user's organizations
          if (orgIds.includes(payload.new.organization_id)) {
            // Add to the list if this is the current org
            if (currentOrganization && payload.new.organization_id === currentOrganization.id) {
              setChannels(prev => {
                // Avoid duplicates
                if (!prev.some(ch => ch.id === payload.new.id)) {
                  return [...prev, payload.new];
                }
                return prev;
              });
            } else {
              // For other orgs the user is part of, just refresh
              router.refresh();
            }
          }
        }
      };

      const handleChannelUpdate = (payload: any) => {
        console.log('Channel updated:', payload);
        if (payload.new && orgIds.includes(payload.new.organization_id)) {
          // Update channels across user's organizations
          setChannels(prev => prev.map(ch => (ch.id === payload.new.id ? payload.new : ch)));
        }
      };

      const handleChannelDelete = (payload: any) => {
        console.log('Channel deleted:', payload);
        if (payload.old) {
          // Remove from current list if it exists
          setChannels(prev => prev.filter(ch => ch.id !== payload.old.id));
        }
      };

      // Configure and subscribe to the channel
      channel
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'channels',
          },
          handleNewChannel
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'channels',
          },
          handleChannelUpdate
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'channels',
          },
          handleChannelDelete
        );

      // Subscribe with proper error handling and retry logic
      try {
        let retryCount = 0;
        const maxRetries = 3;

        const subscribeWithRetry = () => {
          channel.subscribe((status: string) => {
            console.log(`Channel subscription status: ${status}`);

            if (status === 'CHANNEL_ERROR' && retryCount < maxRetries) {
              console.log(
                `Retrying channel subscription (attempt ${retryCount + 1}/${maxRetries})...`
              );
              retryCount++;

              // Remove existing channel and retry after delay
              setTimeout(() => {
                supabase.removeChannel(channel);
                const newChannel = supabase.channel(channelName);

                // Reconfigure the new channel with the same handlers
                newChannel
                  .on(
                    'postgres_changes',
                    {
                      event: 'INSERT',
                      schema: 'public',
                      table: 'channels',
                    },
                    handleNewChannel
                  )
                  .on(
                    'postgres_changes',
                    {
                      event: 'UPDATE',
                      schema: 'public',
                      table: 'channels',
                    },
                    handleChannelUpdate
                  )
                  .on(
                    'postgres_changes',
                    {
                      event: 'DELETE',
                      schema: 'public',
                      table: 'channels',
                    },
                    handleChannelDelete
                  );

                // Update the reference and retry
                channelSubscriptionRef.current = newChannel;
                subscribeWithRetry();
              }, 1000 * retryCount); // Exponential backoff
            }
          });
        };

        subscribeWithRetry();
      } catch (err) {
        console.error('Error subscribing to channel changes:', err);
      }

      // Store the channel reference to clean up later
      channelSubscriptionRef.current = channel;
    };

    // Start the setup process
    fetchUserOrgsAndSetupSubscription();

    return () => {
      // Clean up subscription when component unmounts
      if (channelSubscriptionRef.current) {
        supabase.removeChannel(channelSubscriptionRef.current);
        channelSubscriptionRef.current = null;
      }
    };
  }, [currentOrganization, router]);

  // Subscribe to DM conversation changes
  useEffect(() => {
    if (!user?.id || !supabaseClientRef.current) return;

    const supabase = supabaseClientRef.current;
    const userId = user.id;

    // Clean up previous subscription if it exists
    if (dmSubscriptionRef.current) {
      supabase.removeChannel(dmSubscriptionRef.current);
      dmSubscriptionRef.current = null;
    }

    // Create a new subscription with timestamp for uniqueness
    const dmChannelName = `user-${userId}-dms-${Date.now()}`;
    const dmChannel = supabase.channel(dmChannelName);

    // Define DM handlers
    const handleDmParticipantAdded = async (payload: any) => {
      console.log('DM participant added:', payload);

      if (payload.new && payload.new.conversation_id) {
        await loadAndUpdateConversation(payload.new.conversation_id);
      }
    };

    // Handle participant removal (for deletes)
    const handleDmParticipantRemoved = async (payload: any) => {
      console.log('DM participant removed - EVENT:', payload);

      if (!payload.old) {
        console.log('No old data in participant removal event');
        return;
      }

      console.log(
        `Removed participant with ID: ${payload.old.user_id}, Current user ID: ${userId}`
      );
      console.log(`Conversation ID from removal event: ${payload.old.conversation_id}`);

      if (payload.old.user_id === userId && payload.old.conversation_id) {
        // The current user was removed from a conversation
        console.log(`Current user was removed from conversation ${payload.old.conversation_id}`);

        // Get current DM list
        console.log('Current DMs:', dms);

        // Remove the conversation from the sidebar
        setDMs(prev => {
          const newDms = prev.filter(dm => dm.conversationId !== payload.old.conversation_id);
          console.log(
            `DMs after filtering in participant removal: ${newDms.length} (was ${prev.length})`
          );
          return newDms;
        });

        // If we're currently viewing the deleted conversation, redirect to organization page
        const pathParts = window.location.pathname.split('/');
        const currentConversationId = pathParts[pathParts.length - 1];
        console.log(`Current conversation from URL: ${currentConversationId}`);

        if (currentConversationId === payload.old.conversation_id) {
          console.log('Redirecting because user was removed from the current conversation');
          // Find the organization slug from the URL path
          const orgSlugIndex = pathParts.findIndex(part => part === 'org') + 1;
          if (orgSlugIndex > 0 && orgSlugIndex < pathParts.length) {
            const orgSlug = pathParts[orgSlugIndex];
            router.push(`/protected/org/${orgSlug}`);
          } else {
            router.push('/protected');
          }
        }

        // Refresh the router to update the UI
        setTimeout(() => {
          console.log('Refreshing UI after participant removal');
          router.refresh();
        }, 500);
      } else {
        console.log('User is either not the current user or conversation ID is missing');
      }
    };

    // Handle conversation deletion
    const handleDmConversationDeleted = async (payload: any) => {
      console.log('DM conversation deleted - RECEIVED EVENT:', payload);

      // More verbose logging for debugging
      console.log('Current DMs before deletion:', dms);

      if (payload.old && payload.old.id) {
        // Log which conversation we're going to remove
        const conversationToRemove = payload.old.id;
        console.log(`Attempting to remove conversation ${conversationToRemove} from sidebar`);

        // Check if we actually have this conversation in our state
        const conversationExists = dms.some(dm => dm.conversationId === conversationToRemove);
        console.log(
          `Conversation ${conversationToRemove} exists in sidebar: ${conversationExists}`
        );

        // Remove conversation from sidebar with more verbose logging
        setDMs(prev => {
          const newDms = prev.filter(dm => dm.conversationId !== conversationToRemove);
          console.log(`DMs after filtering: ${newDms.length} (was ${prev.length})`);
          return newDms;
        });

        // If we're currently viewing the deleted conversation, redirect to organization page
        const pathParts = window.location.pathname.split('/');
        const currentConversationId = pathParts[pathParts.length - 1];

        if (currentConversationId === payload.old.id) {
          console.log('Redirecting because current conversation was deleted');
          // Find the organization slug from the URL path
          const orgSlugIndex = pathParts.findIndex(part => part === 'org') + 1;
          if (orgSlugIndex > 0 && orgSlugIndex < pathParts.length) {
            const orgSlug = pathParts[orgSlugIndex];
            router.push(`/protected/org/${orgSlug}`);
          } else {
            router.push('/protected');
          }
        }

        // For good measure, refresh the router after a delay
        setTimeout(() => {
          console.log('Refreshing UI after conversation deletion');
          router.refresh();
        }, 500);
      } else {
        console.log('Invalid payload for deleted conversation:', payload);
      }
    };

    // Handle new conversations being created
    const handleDmConversationCreated = async (payload: any) => {
      console.log('DM conversation created:', payload);

      if (payload.new && payload.new.id) {
        // Check if the current user is a participant in this conversation
        const { data: isParticipant } = await supabase
          .from('direct_message_participants')
          .select('id')
          .eq('conversation_id', payload.new.id)
          .eq('user_id', userId)
          .maybeSingle();

        if (isParticipant) {
          console.log('Current user is a participant in new conversation', payload.new.id);
          await loadAndUpdateConversation(payload.new.id);
        }
      }
    };

    // Helper function to load conversation details and update state
    const loadAndUpdateConversation = async (conversationId: string) => {
      try {
        // We need to load the full conversation details since payload doesn't have them
        const { data } = await supabase
          .from('direct_message_participants')
          .select(
            `
            conversation:direct_message_conversations (id),
            participants:direct_message_conversations!inner(
              direct_message_participants!inner(
                user:users(id, username, display_name, avatar_url, status)
              )
            )
          `
          )
          .eq('conversation_id', conversationId)
          .eq('user_id', userId)
          .single();

        if (data) {
          // Process the conversation the same way as server-side
          const directMessageParticipants = data.participants?.direct_message_participants || [];
          const otherParticipants = directMessageParticipants
            .filter((p: any) => p.user && p.user.id !== userId)
            .map((p: any) => p.user);

          const newDm = {
            conversationId: data.conversation.id,
            users: otherParticipants,
          };

          // Add to DMs list if not already there
          setDMs(prev => {
            // Make sure newDm has organizationId from the conversation data
            const dmWithOrgId = {
              ...newDm,
              organizationId:
                data.conversation.organization_id ||
                (currentOrganization ? currentOrganization.id : ''),
            };

            // Check if conversation already exists
            const existingIndex = prev.findIndex(
              dm => dm.conversationId === dmWithOrgId.conversationId
            );

            if (existingIndex === -1) {
              // If it doesn't exist, add it
              console.log('Adding new DM to sidebar:', dmWithOrgId);
              return [...prev, dmWithOrgId as DirectMessage];
            } else {
              // If it exists, replace it to update any changes in participants
              console.log('Updating existing DM in sidebar:', dmWithOrgId);
              const updatedDms = [...prev];
              updatedDms[existingIndex] = dmWithOrgId as DirectMessage;
              return updatedDms;
            }
          });

          // After updating the state, perform a refresh for good measure
          // This ensures the sidebar is updated with the latest information
          setTimeout(() => {
            router.refresh();
          }, 300);
        }
      } catch (err) {
        console.error('Error fetching DM conversation details:', err);
      }
    };

    // Configure and subscribe
    dmChannel
      // Listen for when the current user is added to a conversation
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_message_participants',
          filter: `user_id=eq.${userId}`,
        },
        handleDmParticipantAdded
      )
      // Listen for when the current user is removed from a conversation
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'direct_message_participants',
          filter: `user_id=eq.${userId}`,
        },
        handleDmParticipantRemoved
      )
      // Also listen for new conversations being created (will check if user is participant)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'direct_message_conversations',
        },
        handleDmConversationCreated
      )
      // Listen for conversations being deleted
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'direct_message_conversations',
        },
        handleDmConversationDeleted
      );

    // Subscribe with proper error handling and retry logic
    try {
      let retryCount = 0;
      const maxRetries = 3;

      const subscribeWithRetry = () => {
        dmChannel.subscribe((status: string) => {
          console.log(`DM subscription status: ${status}`);

          if (status === 'CHANNEL_ERROR' && retryCount < maxRetries) {
            console.log(`Retrying DM subscription (attempt ${retryCount + 1}/${maxRetries})...`);
            retryCount++;

            // Remove existing channel and retry after delay
            setTimeout(() => {
              supabase.removeChannel(dmChannel);
              const newDmChannel = supabase.channel(dmChannelName);

              // Reconfigure the new channel with the same handlers
              newDmChannel
                .on(
                  'postgres_changes',
                  {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'direct_message_participants',
                    filter: `user_id=eq.${userId}`,
                  },
                  handleDmParticipantAdded
                )
                .on(
                  'postgres_changes',
                  {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'direct_message_participants',
                    filter: `user_id=eq.${userId}`,
                  },
                  handleDmParticipantRemoved
                )
                .on(
                  'postgres_changes',
                  {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'direct_message_conversations',
                  },
                  handleDmConversationCreated
                )
                .on(
                  'postgres_changes',
                  {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'direct_message_conversations',
                  },
                  handleDmConversationDeleted
                );

              // Update the reference and retry
              dmSubscriptionRef.current = newDmChannel;
              subscribeWithRetry();
            }, 1000 * retryCount); // Exponential backoff
          }
        });
      };

      subscribeWithRetry();
    } catch (err) {
      console.error('Error subscribing to DM changes:', err);
    }

    // Store the channel reference to clean up later
    dmSubscriptionRef.current = dmChannel;

    return () => {
      // Clean up subscription when component unmounts
      if (dmSubscriptionRef.current) {
        supabase.removeChannel(dmSubscriptionRef.current);
        dmSubscriptionRef.current = null;
      }
    };
  }, [user?.id, router]);

  // Subscribe to organization membership changes only
  useEffect(() => {
    if (!supabaseClientRef.current || !user?.id) return;

    const supabase = supabaseClientRef.current;
    const userId = user.id;

    // Clean up previous subscription if it exists
    if (orgSubscriptionRef.current) {
      supabase.removeChannel(orgSubscriptionRef.current);
      orgSubscriptionRef.current = null;
    }

    // Create a new subscription for organization membership changes
    const orgChannelName = `user-${userId}-organizations-${Date.now()}`;
    const orgChannel = supabase.channel(orgChannelName);

    // Configure and subscribe - listen for membership changes
    orgChannel
      // Listen for when user is added to an organization
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'organization_members',
          filter: `user_id=eq.${userId}`,
        },
        (payload: any) => {
          console.log('User added to organization:', payload);
          if (payload.new) {
            // Force router refresh to update server components with new org
            router.refresh();
          }
        }
      )
      // Listen for when user is removed from an organization
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'organization_members',
          filter: `user_id=eq.${userId}`,
        },
        (payload: any) => {
          console.log('User removed from organization:', payload);

          // If the deleted membership was for the current organization, navigate away
          if (
            currentOrganization &&
            payload.old &&
            payload.old.organization_id === currentOrganization.id
          ) {
            console.log('User was removed from current organization, navigating to /protected');
            router.push('/protected');
          } else {
            // Otherwise just refresh to update the UI
            router.refresh();
          }
        }
      );

    // Listen for changes to organizations the user is a member of
    orgChannel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'organizations',
      },
      (payload: any) => {
        console.log('Organization updated:', payload);
        // Only refresh if this is an organization the user is a member of
        // (will be filtered server-side)
        router.refresh();
      }
    );

    // Subscribe with proper error handling and retry logic
    try {
      let retryCount = 0;
      const maxRetries = 3;

      const subscribeWithRetry = () => {
        orgChannel.subscribe((status: string) => {
          console.log(`Organization subscription status: ${status}`);

          if (status === 'CHANNEL_ERROR' && retryCount < maxRetries) {
            console.log(
              `Retrying organization subscription (attempt ${retryCount + 1}/${maxRetries})...`
            );
            retryCount++;

            // Remove existing channel and retry after delay
            setTimeout(() => {
              supabase.removeChannel(orgChannel);
              const newOrgChannel = supabase.channel(orgChannelName);

              // Reconfigure the new channel with the same handlers
              newOrgChannel
                .on(
                  'postgres_changes',
                  {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'organization_members',
                    filter: `user_id=eq.${userId}`,
                  },
                  (payload: any) => {
                    console.log('User added to organization:', payload);
                    if (payload.new) {
                      router.refresh();
                    }
                  }
                )
                .on(
                  'postgres_changes',
                  {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'organization_members',
                    filter: `user_id=eq.${userId}`,
                  },
                  (payload: any) => {
                    console.log('User removed from organization:', payload);

                    // If the deleted membership was for the current organization, navigate away
                    if (
                      currentOrganization &&
                      payload.old &&
                      payload.old.organization_id === currentOrganization.id
                    ) {
                      console.log(
                        'User was removed from current organization, navigating to /protected'
                      );
                      router.push('/protected');
                    } else {
                      router.refresh();
                    }
                  }
                )
                .on(
                  'postgres_changes',
                  {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'organizations',
                  },
                  (payload: any) => {
                    console.log('Organization updated:', payload);
                    router.refresh();
                  }
                );

              // Update the reference and retry
              orgSubscriptionRef.current = newOrgChannel;
              subscribeWithRetry();
            }, 1000 * retryCount); // Exponential backoff
          }
        });
      };

      subscribeWithRetry();
    } catch (err) {
      console.error('Error subscribing to organization changes:', err);
    }

    // Store the channel reference to clean up later
    orgSubscriptionRef.current = orgChannel;

    return () => {
      // Clean up subscription when component unmounts
      if (orgSubscriptionRef.current) {
        supabase.removeChannel(orgSubscriptionRef.current);
        orgSubscriptionRef.current = null;
      }
    };
  }, [user?.id, router]);

  // Check if the current URL path matches the organization
  const isOrgActive = (slug: string) => {
    // Handle placeholder/home case
    if (!slug) {
      return pathname === '/protected';
    }

    // Use exact match with the organization slug
    return pathname.startsWith(`/protected/org/${slug}/`) || pathname === `/protected/org/${slug}`;
  };

  // We now want all organizations to be expanded by default

  // We no longer need handleAccordionValueChange as we've separated
  // the click behavior from the dropdown action

  // Initial setup - run once on component mount
  useEffect(() => {
    if (currentOrganization && !currentOrgAutoExpandedRef.current) {
      // Mark that we've handled the initial auto-expansion
      currentOrgAutoExpandedRef.current = true;

      // Auto-expand the current organization on first load only
      // This just seeds the initial state - afterward the Accordion handles it
      if (!openOrgs.includes(currentOrganization.id)) {
        setOpenOrgs(prev => [...prev, currentOrganization.id]);
      }
    }
    // This effect should only run once on component mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track previous organization to detect navigation between orgs
  const prevOrgRef = useRef<string | null>(currentOrganization?.id || null);

  // Handle navigation between organizations
  useEffect(() => {
    if (currentOrganization) {
      const currentOrgId = currentOrganization.id;
      const prevOrgId = prevOrgRef.current;

      // Check if we've navigated to a different org
      if (prevOrgId !== currentOrgId) {
        // Update the ref for next time
        prevOrgRef.current = currentOrgId;

        // Add the new org to the expanded list if not already there
        // We're using the functional update to ensure we have the latest state
        if (!openOrgs.includes(currentOrgId)) {
          setOpenOrgs(prev => [...prev, currentOrgId]);
        }
      }
    }
    // Only run when currentOrganization?.id changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOrganization?.id]);

  // Save open organizations to localStorage when they change
  useEffect(() => {
    // Only save in browser environment
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('chatgenius-open-orgs', JSON.stringify(openOrgs));
      } catch (e) {
        console.error('Error saving open orgs to localStorage:', e);
      }
    }
  }, [openOrgs]);

  // Clean up subscriptions when unmounting
  useEffect(() => {
    return () => {
      const supabase = supabaseClientRef.current;
      if (!supabase) return;

      // Clean up all subscriptions
      if (channelSubscriptionRef.current) {
        supabase.removeChannel(channelSubscriptionRef.current);
      }

      if (dmSubscriptionRef.current) {
        supabase.removeChannel(dmSubscriptionRef.current);
      }

      if (orgSubscriptionRef.current) {
        supabase.removeChannel(orgSubscriptionRef.current);
      }
    };
  }, []);

  return (
    <Sidebar>
      <SidebarContent className="pt-4">
        {/* User Profile Button */}
        <SidebarMenu className="px-2 mb-4">
          <SidebarMenuItem>
            <SidebarMenuButton
              isActive={false}
              onClick={() => setSettingsOpen(true)}
              className="flex items-center gap-2"
            >
              <UserAvatar user={user} />
              <span className="font-medium truncate">{user.display_name || user.username}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {/* Organizations Section */}
        <SidebarGroup>
          <div className="flex items-center justify-between px-3 mb-1">
            <SidebarGroupLabel className="text-xs uppercase font-medium text-muted-foreground">
              Organizations
            </SidebarGroupLabel>
            <div className="flex items-center">
              <JoinOrganizationDialog
                userId={user.id}
                trigger={
                  <button
                    className="rounded-md p-1 hover:bg-sidebar-accent mr-1"
                    title="Join Organization"
                  >
                    <Users className="h-4 w-4" />
                  </button>
                }
              />
              <CreateOrganizationDialog
                trigger={
                  <button
                    className="rounded-md p-1 hover:bg-sidebar-accent"
                    title="Create Organization"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                }
              />
            </div>
          </div>
          <SidebarGroupContent>
            <Accordion
              type="multiple"
              // Use the openOrgs state to control which organizations are expanded
              value={openOrgs}
              // This handler allows users to fully control which orgs are expanded
              onValueChange={value => {
                console.log('Accordion state changing to:', value);
                setOpenOrgs(value);
              }}
              className="border-none"
            >
              {/* Organizations List */}
              {organizations.map(org => {
                const isActive = isOrgActive(org.slug);

                return (
                  <AccordionItem key={org.id} value={org.id} className="border-none py-1">
                    <div className="px-2">
                      <AccordionTrigger
                        className={cn(
                          'py-2 px-2 hover:no-underline rounded-md flex justify-between items-center',
                          isActive ? 'bg-sidebar-accent font-medium' : 'hover:bg-sidebar-accent/50'
                        )}
                      >
                        <span
                          className="text-sm cursor-pointer"
                          onClick={e => {
                            e.stopPropagation();
                            // Navigate to org page without redirect to channel
                            router.push(`/protected/org/${org.slug}`);
                          }}
                        >
                          {org.name}
                        </span>
                      </AccordionTrigger>
                    </div>

                    <AccordionContent className="pb-0 pt-1">
                      {/* Channels Section */}
                      <SidebarGroup>
                        <div className="flex items-center justify-between">
                          <SidebarGroupLabel>Channels</SidebarGroupLabel>
                          <CreateChannelDialog
                            organizationId={org.id}
                            organizationSlug={org.slug}
                            trigger={
                              <button className="rounded-md p-1 hover:bg-sidebar-accent">
                                <Plus className="h-4 w-4" />
                              </button>
                            }
                          />
                        </div>
                        <SidebarGroupContent>
                          <SidebarMenu>
                            {/* Display all channels for this organization */}
                            {/* Always use the live-updated channels list for all organizations */}
                            {channels
                              .filter(c => c.organization_id === org.id)
                              .map(channel => {
                                const channelPath = `/protected/org/${org.slug}/channel/${channel.slug}`;
                                const isActive = pathname === channelPath;

                                return (
                                  <SidebarMenuItem key={channel.id}>
                                    <SidebarMenuButton asChild isActive={isActive}>
                                      <NextLink href={channelPath}>
                                        <Hash className="h-4 w-4" />
                                        <span>{channel.name}</span>
                                      </NextLink>
                                    </SidebarMenuButton>
                                  </SidebarMenuItem>
                                );
                              })}
                          </SidebarMenu>
                        </SidebarGroupContent>
                      </SidebarGroup>

                      {/* Direct Messages Section */}
                      <SidebarGroup>
                        <div className="flex items-center justify-between">
                          <SidebarGroupLabel>Direct Messages</SidebarGroupLabel>
                          <CreateDMDialog
                            organizationId={org.id}
                            organizationSlug={org.slug}
                            currentUserId={user.id}
                            trigger={
                              <button className="rounded-md p-1 hover:bg-sidebar-accent">
                                <Plus className="h-4 w-4" />
                              </button>
                            }
                          />
                        </div>
                        <SidebarGroupContent>
                          <SidebarMenu>
                            {/* Use local DMs state, filtered by organization */}
                            {dms
                              // Only show DMs that belong to this organization
                              .filter(dm => {
                                // Check if this DM conversation belongs to the current organization
                                return dm.organizationId === org.id;
                              })
                              .map(dm => {
                                const otherUser = dm.users.find(u => u.id !== user.id);
                                if (!otherUser) return null;

                                const dmPath = `/protected/org/${org.slug}/dm/${dm.conversationId}`;
                                const isActive = pathname === dmPath;

                                return (
                                  <SidebarMenuItem key={dm.conversationId}>
                                    <SidebarMenuButton asChild isActive={isActive}>
                                      <NextLink href={dmPath} className="flex items-center gap-2">
                                        <UserAvatar user={otherUser} />
                                        <span>{otherUser.display_name || otherUser.username}</span>
                                      </NextLink>
                                    </SidebarMenuButton>
                                  </SidebarMenuItem>
                                );
                              })}
                          </SidebarMenu>
                        </SidebarGroupContent>
                      </SidebarGroup>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* We show a message instead of a redundant button when there are no organizations */}
        {organizations.length === 0 && (
          <SidebarGroup>
            <SidebarGroupContent>
              <div className="px-4 py-2 text-sm text-muted-foreground">
                Click the + icon above to create your first organization
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu className="px-2">
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => setSettingsOpen(true)}>
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={() => signOutAction()}>
              <LogOut className="h-4 w-4" />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <UserSettingsDialog userId={user.id} open={settingsOpen} onOpenChange={setSettingsOpen} />
    </Sidebar>
  );
}
