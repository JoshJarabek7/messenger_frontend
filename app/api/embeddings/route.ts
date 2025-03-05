import { NextResponse } from 'next/server';

// Database type is imported for type checking in this file
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Database } from '@/types/supabase';
import { createClient } from '@/utils/supabase/server';
import { embedText, countTokens, MAX_EMBEDDING_INPUT_TOKENS } from '@/utils/utils';

// Real implementation using OpenAI API for embeddings
async function getEmbedding(text: string) {
  try {
    // Validate input text
    if (!text || text.trim() === '') {
      throw new Error('Empty text cannot be embedded');
    }

    // Check if text exceeds token limit
    const tokenCount = await countTokens(text);
    console.log(`Generating embedding for text with ${tokenCount} tokens`);

    if (tokenCount <= MAX_EMBEDDING_INPUT_TOKENS) {
      // Text is within token limits, generate embedding directly
      const embedding = await embedText(text);

      // Validate the returned embedding
      if (!embedding || !Array.isArray(embedding) || embedding.length === 0) {
        throw new Error('Embedding generation returned no results');
      }

      // Since embedText returns array of embeddings (for multiple chunks),
      // we take the first embedding or average them if multiple chunks
      if (embedding.length === 1) {
        // Validate that the embedding is not all zeros
        const isAllZeros = embedding[0].every(val => val === 0);
        if (isAllZeros) {
          throw new Error('Generated embedding contains all zeros, API key issue');
        }
        return embedding[0];
      } else if (embedding.length > 1) {
        // Average multiple embeddings if text was split into chunks
        const dimensions = embedding[0].length;
        const average = Array(dimensions).fill(0);

        for (const vector of embedding) {
          for (let i = 0; i < dimensions; i++) {
            average[i] += vector[i] / embedding.length;
          }
        }

        return average;
      } else {
        throw new Error('No valid embedding was generated');
      }
    } else {
      // Text exceeds token limits, split and process with embedText
      const embeddings = await embedText(text);

      if (!embeddings || !Array.isArray(embeddings) || embeddings.length === 0) {
        throw new Error('Embedding generation for chunked text returned no results');
      }

      // Average all embeddings
      const dimensions = embeddings[0].length;
      const average = Array(dimensions).fill(0);

      for (const vector of embeddings) {
        for (let i = 0; i < dimensions; i++) {
          average[i] += vector[i] / embeddings.length;
        }
      }

      return average;
    }
  } catch (error) {
    console.error('Error generating embedding:', error);
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error(`Failed to generate embedding: ${String(error)}`);
    }
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request data
    const { text, type, id } = await request.json();

    if (!text) {
      return NextResponse.json({ error: 'Missing text field' }, { status: 400 });
    }

    // Generate embedding
    const embedding = await getEmbedding(text);

    // Special case for search query - just return the embedding
    if (type === 'search_query') {
      return NextResponse.json({
        success: true,
        embedding: embedding,
      });
    }

    // For other types, require ID
    if (!type || !id) {
      return NextResponse.json({ error: 'Missing required fields (type, id)' }, { status: 400 });
    }

    // Store the embedding in the appropriate table
    let result;

    if (type === 'message') {
      result = await supabase
        .from('messages')
        .update({
          content_embedding: JSON.stringify(embedding), // Convert to string
        })
        .eq('id', id);
    } else if (type === 'organization') {
      // Use upsert to update existing record or create a new one
      result = await supabase.from('organization_embeddings').upsert({
        organization_id: id,
        content: text,
        embedding: JSON.stringify(embedding), // Convert to string
        updated_at: new Date().toISOString(),
      });
    } else if (type === 'channel') {
      // Use upsert to update existing record or create a new one
      result = await supabase.from('channel_embeddings').upsert({
        channel_id: id,
        content: text,
        embedding: JSON.stringify(embedding), // Convert to string
        updated_at: new Date().toISOString(),
      });
    } else if (type === 'user') {
      // First check if an entry already exists and delete it to avoid unique constraint violation
      await supabase.from('user_embeddings').delete().eq('user_id', id);

      // Then insert the new embedding
      result = await supabase.from('user_embeddings').insert({
        user_id: id,
        content: text,
        embedding: JSON.stringify(embedding), // Convert to string
        updated_at: new Date().toISOString(),
      });
    } else {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    if (result.error) {
      console.error(`Error in ${type} embedding operation:`, result.error);
      return NextResponse.json(
        {
          error: `Failed to save ${type} embedding: ${result.error.message}`,
          details: result.error,
        },
        { status: 500 }
      );
    }

    console.log(`Successfully saved ${type} embedding for ID: ${id}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error in embeddings endpoint:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate or save embedding',
        message: errorMessage,
      },
      { status: 500 }
    );
  }
}
