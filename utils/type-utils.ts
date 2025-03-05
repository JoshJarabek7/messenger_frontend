// Type utility functions for handling null vs undefined type conversions
import {
  User,
  Organization,
  Channel,
  Message,
  Reaction,
  // Unused type imports removed:
  // FileAttachment,
  // Participant,
  // ChannelMember
} from '@/types/app';
import { Database } from '@/types/supabase';

/**
 * Converts null values to undefined to match component prop types
 */
export function nullToUndefined<T>(value: T | null): T | undefined {
  return value === null ? undefined : value;
}

/**
 * Converts undefined values to null to match database types
 */
export function undefinedToNull<T>(value: T | undefined): T | null {
  return value === undefined ? null : value;
}

/**
 * Converts database user object with null values to component-compatible user with undefined values
 */
export function convertUser(
  user: Database['public']['Tables']['users']['Row'] | null
): User | null {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    display_name: nullToUndefined(user.display_name),
    email: user.email,
    bio: nullToUndefined(user.bio),
    ai_persona_prompt: nullToUndefined(user.ai_persona_prompt),
    avatar_url: nullToUndefined(user.avatar_url),
    status: nullToUndefined(user.status) as User['status'],
    last_seen: nullToUndefined(user.last_seen),
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

/**
 * Converts array of database user objects to component-compatible format
 */
export function convertUsers(users: Database['public']['Tables']['users']['Row'][]): User[] {
  if (!users) return [];
  return users.map(convertUser).filter((u): u is User => u !== null);
}

/**
 * Converts database organization object with null values to component-compatible
 * organization with undefined values
 */
export function convertOrganization(
  org:
    | (Database['public']['Tables']['organizations']['Row'] & {
        isMember?: boolean;
        similarity?: number;
        similarityPercent?: string;
      })
    | null
): Organization | null {
  if (!org) return null;
  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    description: nullToUndefined(org.description),
    avatar_url: nullToUndefined(org.avatar_url),
    owner_id: org.owner_id,
    created_at: org.created_at,
    updated_at: org.updated_at,
    // Preserve additional properties for UI display
    isMember: org.isMember,
    similarity: org.similarity,
    similarityPercent: org.similarityPercent,
  };
}

/**
 * Converts array of database organization objects to component-compatible format
 */
export function convertOrganizations(
  orgs: (Database['public']['Tables']['organizations']['Row'] & {
    isMember?: boolean;
    similarity?: number;
    similarityPercent?: string;
  })[]
): Organization[] {
  if (!orgs) return [];
  return orgs.map(convertOrganization).filter((o): o is Organization => o !== null);
}

/**
 * Converts database channel object with null values to component-compatible
 * channel with undefined values
 */
export function convertChannel(
  channel: Database['public']['Tables']['channels']['Row'] | null
): Channel | null {
  if (!channel) return null;
  return {
    id: channel.id,
    name: channel.name,
    slug: channel.slug,
    description: nullToUndefined(channel.description),
    is_public: channel.is_public,
    organization_id: channel.organization_id,
    created_at: channel.created_at,
    updated_at: channel.updated_at,
  };
}

/**
 * Converts array of database channel objects to component-compatible format
 */
export function convertChannels(
  channels: Database['public']['Tables']['channels']['Row'][]
): Channel[] {
  if (!channels) return [];
  return channels.map(convertChannel).filter((c): c is Channel => c !== null);
}

/**
 * Converts a Reaction object from database format to component format
 */
export function convertReaction(
  reaction: Database['public']['Tables']['reactions']['Row'] | null
): Reaction | null {
  if (!reaction) return null;
  return {
    id: reaction.id,
    emoji: reaction.emoji,
    user_id: reaction.user_id,
    message_id: reaction.message_id,
    created_at: reaction.created_at,
  };
}

/**
 * Converts a Message object with its relationships from database format to component format
 */
export function convertMessage(
  message:
    | (Database['public']['Tables']['messages']['Row'] & {
        sender?: Database['public']['Tables']['users']['Row'];
        reactions?: Database['public']['Tables']['reactions']['Row'][];
        file_attachments?: Database['public']['Tables']['file_attachments']['Row'][];
        reply_count?: number;
      })
    | null
): Message | null {
  if (!message) return null;

  return {
    id: message.id,
    content: message.content,
    created_at: message.created_at,
    updated_at: message.updated_at,
    is_ai_generated: message.is_ai_generated,
    sender_id: message.sender_id,
    parent_message_id: nullToUndefined(message.parent_message_id),
    channel_id: nullToUndefined(message.channel_id),
    conversation_id: nullToUndefined(message.conversation_id),
    sender: message.sender ? convertUser(message.sender) || undefined : undefined,
    reactions: message.reactions
      ? message.reactions.map(r => convertReaction(r)).filter((r): r is Reaction => r !== null)
      : [],
    file_attachments: message.file_attachments
      ? message.file_attachments.map(f => ({
          id: f.id,
          file_name: f.file_name,
          file_path: f.file_path,
          file_size: f.file_size,
          file_type: f.file_type,
          message_id: f.message_id,
          created_at: f.created_at,
        }))
      : [],
    reply_count: message.reply_count || 0,
  };
}

/**
 * Type guard for explicit type checking
 */
export function isDbUser(obj: unknown): obj is Database['public']['Tables']['users']['Row'] {
  if (!obj) return false;
  const user = obj as Record<string, unknown>;
  return (
    typeof user.id === 'string' &&
    typeof user.username === 'string' &&
    typeof user.email === 'string'
  );
}

/**
 * Type guard for organization type checking
 */
export function isDbOrganization(
  obj: unknown
): obj is Database['public']['Tables']['organizations']['Row'] {
  if (!obj) return false;
  const org = obj as Record<string, unknown>;
  return (
    typeof org.id === 'string' &&
    typeof org.name === 'string' &&
    typeof org.slug === 'string' &&
    typeof org.owner_id === 'string'
  );
}
