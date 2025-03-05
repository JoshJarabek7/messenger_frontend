import { redirect } from 'next/navigation';

import ShadcnSidebar, { DirectMessage } from '@/components/shadcn-sidebar';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { UserProvider } from '@/hooks/use-user-context';
import { Channel, User } from '@/types/app';
import { Database } from '@/types/supabase';
import { createClient } from '@/utils/supabase/server';
import {
  convertUser,
  convertChannel,
  convertOrganization,
  convertOrganizations,
} from '@/utils/type-utils';

interface OrganizationLayoutProps {
  children: React.ReactNode;
  params: {
    slug: string;
  };
}

export default async function OrganizationLayout({ children, params }: OrganizationLayoutProps) {
  // You must await params in Nextjs 15
  const promiseResult = await Promise.resolve(params);
  const slug = promiseResult.slug;
  console.log('Organization layout - loading slug:', slug);
  const supabase = await createClient();

  // Get the current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    redirect('/sign-in');
  }

  // Get user profile
  const { data: profile } = (await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()) as { data: Database['public']['Tables']['users']['Row'] | null };

  // Get the organization
  const { data: organization, error: orgError } = (await supabase
    .from('organizations')
    .select('*')
    .eq('slug', slug)
    .single()) as {
    data: Database['public']['Tables']['organizations']['Row'] | null;
    error: { message: string } | null;
  };

  if (orgError || !organization) {
    redirect('/protected');
  }

  // Check if the user is a member of this organization
  const { data: membership } = await supabase
    .from('organization_members')
    .select('id')
    .eq('organization_id', organization.id)
    .eq('user_id', user.id)
    .maybeSingle();

  // If the user is not a member, redirect them to join
  if (!membership) {
    redirect(`/protected/join-organization?org=${slug}`);
  }

  console.log('User accessing organization:', {
    organizationId: organization.id,
    userId: user.id,
  });

  // Get the channels in the organization
  const { data: channels } = (await supabase
    .from('channels')
    .select('*')
    .eq('organization_id', organization.id)
    .order('name', { ascending: true })) as {
    data: Database['public']['Tables']['channels']['Row'][] | null;
  };

  // Get direct message conversations for the user
  const { data: directMessages } = await supabase
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

  // Process direct messages to get other participants
  const directMessageUsers =
    directMessages?.map(dm => {
      // Ensure dm.participants exists and has the expected structure
      if (!dm.participants || !dm.participants.direct_message_participants) {
        return {
          conversationId: dm.conversation ? dm.conversation.id : '',
          organizationId: dm.conversation ? dm.conversation.organization_id : '',
          users: [],
        };
      }

      // Use the type definitions from the Database type
      type ParticipantUser = Database['public']['Tables']['users']['Row'];

      // Filter the direct message participants to get only other users
      const directMessageParticipants = dm.participants?.direct_message_participants || [];
      const otherParticipants = directMessageParticipants
        .filter(p => p.user && p.user.id !== user.id)
        .map(p => p.user as ParticipantUser);

      return {
        conversationId: dm.conversation ? dm.conversation.id : '',
        organizationId: dm.conversation ? dm.conversation.organization_id : '',
        users: otherParticipants,
      };
    }) || [];

  // Get only organizations the user is a member of
  const { data: memberOrgs } = await supabase
    .from('organization_members')
    .select('organization:organizations(*)')
    .eq('user_id', user.id)
    .order('organization(name)');

  // Extract the organizations from the membership records
  const organizations = memberOrgs ? memberOrgs.map(item => item.organization) : [];

  const userProfile = profile || {
    id: user.id,
    username: user.email?.split('@')[0] || 'user',
    display_name: null,
    avatar_url: null,
    status: null,
    ai_persona_prompt: null,
    bio: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    email: user.email || '',
    last_seen: null,
  };

  return (
    <UserProvider
      initialUser={
        convertUser(userProfile) || {
          id: userProfile.id,
          username: userProfile.username,
          email: userProfile.email,
          display_name: userProfile.display_name ?? undefined,
          avatar_url: userProfile.avatar_url ?? undefined,
          bio: userProfile.bio ?? undefined,
          ai_persona_prompt: userProfile.ai_persona_prompt ?? undefined,
          status: userProfile.status as User['status'],
          created_at: userProfile.created_at,
          updated_at: userProfile.updated_at,
        }
      }
    >
      <SidebarProvider defaultOpen={true}>
        <div className="flex h-screen bg-background w-screen">
          <ShadcnSidebar
            user={
              convertUser(userProfile) || {
                id: userProfile.id,
                username: userProfile.username,
                email: userProfile.email,
                display_name: userProfile.display_name ?? undefined,
                avatar_url: userProfile.avatar_url ?? undefined,
                status: userProfile.status as User['status'],
              }
            }
            currentOrganization={convertOrganization(organization)}
            organizations={convertOrganizations(organizations || [])}
            channels={
              (channels || [])
                .map(ch => convertChannel(ch))
                .filter((ch): ch is Channel => ch !== null) as Channel[]
            }
            directMessages={directMessageUsers as DirectMessage[]}
          />

          <SidebarInset className="flex-1 flex flex-col w-full">
            <div className="p-2">
              <SidebarTrigger />
            </div>
            <main className="flex-1 overflow-auto w-full">{children}</main>
          </SidebarInset>
        </div>
      </SidebarProvider>
    </UserProvider>
  );
}
