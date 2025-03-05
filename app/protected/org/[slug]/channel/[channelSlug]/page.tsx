import { redirect } from 'next/navigation';

import { ChannelHeader } from '@/components/channel-header';
import MessageComposer from '@/components/message-composer';
import MessageList, { Message } from '@/components/message-list';
import { User } from '@/types/app';
import { createClient } from '@/utils/supabase/server';
import { convertChannel, convertUser, convertUsers } from '@/utils/type-utils';

interface ChannelPageProps {
  params: {
    slug: string;
    channelSlug: string;
  };
}

export default async function ChannelPage({ params }: ChannelPageProps) {
  // Need to await params in Next.js
  const resolvedParams = await Promise.resolve(params);
  const slug = resolvedParams.slug;
  const channelSlug = resolvedParams.channelSlug;
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return redirect('/sign-in');
  }

  // Get the organization
  const { data: organization, error: orgError } = await supabase
    .from('organizations')
    .select('*')
    .eq('slug', slug)
    .single();

  if (orgError || !organization) {
    return redirect('/protected');
  }

  // Get the channel
  const { data: channelData, error: channelError } = await supabase
    .from('channels')
    .select('*')
    .eq('organization_id', organization.id)
    .eq('slug', channelSlug)
    .single();

  if (channelError || !channelData) {
    return redirect(`/protected/org/${slug}`);
  }

  // Convert channel to component format
  const channel = convertChannel(channelData);
  if (!channel) {
    return redirect(`/protected/org/${slug}`);
  }

  // All users now have access to all channels - no membership check needed

  // Get the channel messages (limited to most recent 50)
  const { data: messagesData } = await supabase
    .from('messages')
    .select(
      `
      id,
      content,
      created_at,
      is_ai_generated,
      parent_message_id,
      sender:users (
        id,
        username,
        display_name,
        avatar_url,
        status
      ),
      reactions (
        id,
        emoji,
        user_id
      ),
      file_attachments (
        id,
        file_name,
        file_type,
        file_path,
        file_size
      )
    `
    )
    .eq('channel_id', channel.id)
    .is('parent_message_id', null) // Only get top-level messages, not thread replies
    .order('created_at', { ascending: true }) // Use ascending order to match client-side order
    .limit(50);

  // Get reply counts for each message - simplified approach
  let replyCounts: { parent_message_id: string; reply_count: number }[] = [];
  const messageIds = messagesData?.map(msg => msg.id) || [];

  if (messageIds.length > 0) {
    try {
      // Direct query approach without group_by - more compatible with different Supabase versions
      const { data: replyMessages } = await supabase
        .from('messages')
        .select('parent_message_id')
        .in('parent_message_id', messageIds);

      if (replyMessages && replyMessages.length > 0) {
        // Count replies manually
        const countMap = new Map();

        replyMessages.forEach(msg => {
          const parentId = msg.parent_message_id;
          countMap.set(parentId, (countMap.get(parentId) || 0) + 1);
        });

        // Convert to the expected format
        replyCounts = Array.from(countMap.entries()).map(([parent_message_id, count]) => ({
          parent_message_id,
          reply_count: count,
        }));
      }
    } catch (err) {
      console.error('Error fetching reply counts:', err);
    }
  }

  // Get user profile
  const { data: profileData } = await supabase.from('users').select('*').eq('id', user.id).single();

  // Convert profile to component format
  const profile = convertUser(profileData);
  if (!profile) {
    return redirect('/sign-in');
  }

  // Get all users for @mentions - since all users can access all channels
  const { data: allUsersData } = await supabase
    .from('users')
    .select('*') // Get all fields
    .limit(50); // Limit to a reasonable number

  // Convert members to component format
  const members = convertUsers(allUsersData || []);

  // Convert messages to component format with reply counts
  // Handle message conversion for message list component
  const messageList: Message[] = messagesData
    ? messagesData.map(msg => {
        // Find reply count for this message
        const replyCountObj = replyCounts.find(rc => rc.parent_message_id === msg.id);

        // Convert to the specific Message type used by message-list component
        return {
          id: msg.id,
          content: msg.content,
          created_at: msg.created_at,
          is_ai_generated: msg.is_ai_generated,
          parent_message_id: msg.parent_message_id, // null is accepted here
          sender_id: msg.sender?.id || '',
          sender: convertUser(Array.isArray(msg.sender) ? msg.sender[0] : msg.sender) as User,
          reactions: (msg.reactions || []).map(r => ({
            id: r.id,
            emoji: r.emoji,
            user_id: r.user_id,
            message_id: msg.id,
            created_at: new Date().toISOString(), // Default value for created_at
          })),
          file_attachments: (msg.file_attachments || []).map(f => ({
            id: f.id,
            file_name: f.file_name,
            file_path: f.file_path,
            file_size: f.file_size || 0,
            file_type: f.file_type,
            message_id: msg.id,
            created_at: new Date().toISOString(), // Default value for created_at
          })),
          reply_count: replyCountObj ? replyCountObj.reply_count : 0,
        } as Message;
      })
    : [];

  return (
    <div className="flex flex-col h-full w-full">
      <ChannelHeader channel={channel} />

      <div className="flex-1 p-4 overflow-hidden" style={{ height: 'calc(100% - 140px)' }}>
        <MessageList
          messages={messageList}
          currentUser={profile}
          organizationId={organization.id}
          channelId={channel.id}
          key={channel.id} /* Ensure stability */
          members={members} /* Pass members for @mention dropdown */
        />
      </div>

      <div className="p-4 border-t" id="message-composer">
        <MessageComposer
          placeholder={`Message #${channel.name}`}
          channelId={channel.id}
          userId={user.id}
          members={members.map(member => ({
            id: member.id,
            username: member.username,
            display_name: member.display_name,
          }))}
        />
      </div>
    </div>
  );
}
