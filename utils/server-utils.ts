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
    // Use OpenAI client to generate the embedding directly
    const openaiClient = createOpenAIClient();
    
    // Generate embedding using OpenAI
    const embedding = await openaiClient.embeddings.create({
      model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-large',
      input: contentText,
      dimensions: parseInt(process.env.OPENAI_EMBEDDING_DIMENSIONS || '1536'),
    });
    
    // Validate the embedding result
    if (!embedding.data || !embedding.data[0] || !embedding.data[0].embedding) {
      throw new Error('OpenAI returned an invalid embedding response');
    }
    
    const embeddingVector = embedding.data[0].embedding;
    
    // Now store the embedding in the database
    const supabase = await createClient();
    
    // Create the organization_embeddings record with the actual embedding
    // Note: Supabase expects the embedding to be stored as a string
    const { error } = await supabase.from('organization_embeddings').upsert({
      organization_id: orgId,
      content: contentText,
      embedding: JSON.stringify(embeddingVector), // Store the embedding as a JSON string
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Database error storing organization embedding:', error);
      throw error;
    }

    // Verify the embedding was stored correctly
    const { data: verifyData, error: verifyError } = await supabase
      .from('organization_embeddings')
      .select('embedding')
      .eq('organization_id', orgId)
      .single();
      
    if (verifyError || !verifyData || !verifyData.embedding) {
      console.error('Failed to verify embedding storage:', verifyError);
      throw new Error('Embedding verification failed');
    }

    return true;
  } catch (error) {
    console.error('Error generating organization embedding (server):', error);
    return false;
  }
}
