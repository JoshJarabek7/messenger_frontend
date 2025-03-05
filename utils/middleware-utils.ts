import { SupabaseClient } from '@supabase/supabase-js';

import { Database } from '@/types/supabase';

/**
 * Updates a user's status and last_seen timestamp.
 * Middleware-safe version that doesn't import tiktoken.
 *
 * @param {SupabaseClient<Database>} supabase - The Supabase client.
 * @param {string} userId - The user's ID.
 * @param {'online' | 'offline' | 'away'} status - The status to set.
 * @returns {Promise<{error?: {message: string} | null}>} The result of the update operation.
 */
export const updateUserStatus = async (
  supabase: SupabaseClient<Database>,
  userId: string,
  status: 'online' | 'offline' | 'away'
) => {
  try {
    const result = await supabase
      .from('users')
      .update({
        status,
        last_seen: new Date().toISOString(),
      })
      .eq('id', userId);

    // Convert result to expected format
    return {
      error: result.error ? { message: result.error.message } : null,
    };
  } catch (error: unknown) {
    console.error('Error updating user status:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error updating status';
    return {
      error: {
        message: errorMessage,
      },
    };
  }
};
