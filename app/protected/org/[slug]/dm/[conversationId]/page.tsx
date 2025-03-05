import { redirect } from 'next/navigation';

import { DirectMessageHeader } from '@/components/direct-message-header';
import MessageComposer from '@/components/message-composer';
import MessageList, { Message } from '@/components/message-list';
import { Participant, User } from '@/types/app';
import { createClient } from '@/utils/supabase/server';
import { convertUser } from '@/utils/type-utils';

interface DMPageProps {
  params: {
    slug: string;
    conversationId: string;
  };
}

export default async function DMPage({ params }: DMPageProps) {
  // Need to await params in Next.js
  const resolvedParams = await Promise.resolve(params);
  const slug = resolvedParams.slug;
  const conversationId = resolvedParams.conversationId;
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

  // Get the conversation and its participants
  const { data: conversation, error: convError } = await supabase
    .from('direct_message_conversations')
    .select(
      `
      id,
      direct_message_participants (
        user:users (
          id, 
          username,
          display_name,
          avatar_url,
          status
        )
      )
    `
    )
    .eq('id', conversationId)
    .single();

  if (convError || !conversation) {
    return redirect(`/protected/org/${slug}`);
  }

  // Type for database participants before conversion
  interface DbParticipant {
    user: {
      id: string;
      username: string;
      display_name: string | null;
      avatar_url: string | null;
      status: string | null;
    };
  }

  const participants = conversation.direct_message_participants as DbParticipant[];

  // Check if the user is part of this conversation
  const isParticipant = participants.some(p => p.user.id === user.id);

  if (!isParticipant) {
    return redirect(`/protected/org/${slug}`);
  }

  // Convert participants to component format
  const convertedParticipants: Participant[] = participants.map(p => ({
    user: convertUser({
      id: p.user.id,
      username: p.user.username,
      display_name: p.user.display_name,
      avatar_url: p.user.avatar_url,
      status: p.user.status,
      email: 'user@example.com', // Placeholder for required field
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      bio: null,
      ai_persona_prompt: null,
      last_seen: null,
    }) || {
      id: p.user.id,
      username: p.user.username,
      display_name: p.user.display_name ?? undefined,
      avatar_url: p.user.avatar_url ?? undefined,
      email: 'user@example.com', // Required by the User type
      status: (p.user.status as User['status']) ?? undefined,
    },
    conversation_id: conversationId,
  }));

  // Get other participants (excluding current user)
  const otherParticipants: User[] = convertedParticipants
    .filter(p => p.user.id !== user.id)
    .map(p => p.user);

  // Get messages for this conversation
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
    .eq('conversation_id', conversationId)
    .is('parent_message_id', null) // Only get top-level messages, not thread replies
    .order('created_at', { ascending: true }) // Use ascending order
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
    <div className="flex flex-col h-full">
      <DirectMessageHeader
        participants={otherParticipants}
        conversationId={conversationId}
        organizationSlug={slug}
      />

      <div className="flex-1 overflow-y-auto p-4">
        <MessageList
          messages={messageList}
          currentUser={profile}
          organizationId={organization.id}
          conversationId={conversationId}
          key={conversationId} /* Ensure stability */
          members={otherParticipants} /* Pass participants for @mention dropdown */
        />
      </div>

      <div className="p-4 border-t">
        <MessageComposer
          placeholder={`Message ${otherParticipants.map(p => p.display_name || p.username).join(', ')}`}
          conversationId={conversationId}
          userId={user.id}
          members={otherParticipants.map(p => ({
            id: p.id,
            username: p.username,
            display_name: p.display_name,
          }))}
        />
      </div>
    </div>
  );
}
