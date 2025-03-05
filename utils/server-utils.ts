import { OpenAI } from 'openai';

import { createClient } from '@/utils/supabase/server';

/**
 * Gets the base URL for the application, handling both development and production environments.
 * @returns {string} The base URL of the application
 */
export const getBaseUrl = (): string => {
  // Use environment variable, Vercel URL, or localhost as fallback
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) ||
    'http://localhost:3000';

  return baseUrl;
};

/**
 * Creates and configures an OpenAI client with the API key from environment variables
 * @returns {OpenAI} The configured OpenAI client
 * @throws {Error} If no API key is found
 */
export const createOpenAIClient = (): OpenAI => {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing OpenAI API key in environment variables');
  }

  return new OpenAI({
    apiKey,
  });
};

// Helper function to generate embeddings for a user - SERVER SIDE ONLY
export async function generateUserEmbeddingsServer(userId: string, contentText: string) {
  try {
    const supabase = await createClient();

    // Create the user_embeddings record or update it if it exists
    const { error } = await supabase.from('user_embeddings').upsert({
      user_id: userId,
      content: contentText,
      updated_at: new Date().toISOString(),
      // The embedding will be computed later by the vector_update trigger
    });

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error generating user embedding (server):', error);
    return false;
  }
}

// Helper function to generate embeddings for an organization - SERVER SIDE ONLY
export async function generateOrganizationEmbeddingsServer(orgId: string, contentText: string) {
  try {
    const supabase = await createClient();

    // Create the organization_embeddings record
    const { error } = await supabase.from('organization_embeddings').upsert({
      organization_id: orgId,
      content: contentText,
      updated_at: new Date().toISOString(),
      // The embedding will be computed later by the vector_update trigger
    });

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Error generating organization embedding (server):', error);
    return false;
  }
}
