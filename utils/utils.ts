import { redirect } from 'next/navigation';
import { OpenAI } from 'openai';

// Define types for the tiktoken library - updated for js-tiktoken
interface Encoding {
  encode: (text: string) => number[];
  // Note: js-tiktoken doesn't need free() as it's not using WASM
}

interface TiktokenModule {
  getEncoding: (encodingName: string) => Encoding;
  encodingForModel: (modelName: string) => Encoding;
}

// These are imported and initialized dynamically to prevent middleware issues
let embedding_enc: Encoding | null = null;
let assistant_enc: Encoding | null = null;
let tiktoken: TiktokenModule | null = null;

// Flag to track if initialization is in progress
let isInitializing = false;
// Promise that resolves when initialization is complete
let initializationPromise: Promise<void> | null = null;

// Check if we're in a browser environment
const isSafeTiktokenEnvironment = (): boolean => {
  return typeof window !== 'undefined';
};

// Initialize encoders only in browser context
const initializeTiktoken = async (): Promise<void> => {
  // Skip initialization outside browser or if already in progress
  if (!isSafeTiktokenEnvironment() || isInitializing) {
    return initializationPromise || Promise.resolve();
  }

  isInitializing = true;

  initializationPromise = new Promise<void>(resolve => {
    try {
      // Dynamic import js-tiktoken instead of tiktoken
      import('js-tiktoken')
        .then(module => {
          tiktoken = module as unknown as TiktokenModule;
          if (tiktoken) {
            try {
              // Initialize models - js-tiktoken uses camelCase method names
              try {
                embedding_enc = tiktoken.encodingForModel('text-embedding-3-large');
              } catch (embeddingError) {
                console.warn(
                  'Could not initialize embedding model, falling back to cl100k_base:',
                  embeddingError
                );
                try {
                  embedding_enc = tiktoken.getEncoding('cl100k_base');
                } catch (fallbackError) {
                  console.error('Failed to initialize embedding encoder:', fallbackError);
                }
              }

              try {
                assistant_enc = tiktoken.encodingForModel('o1');
              } catch (assistantError) {
                console.warn(
                  'Could not initialize assistant model, falling back to cl100k_base:',
                  assistantError
                );
                try {
                  assistant_enc = tiktoken.getEncoding('cl100k_base');
                } catch (fallbackError) {
                  console.error('Failed to initialize assistant encoder:', fallbackError);
                }
              }
            } catch (modelError) {
              console.warn('Error initializing js-tiktoken models:', modelError);
            }
          }
          resolve();
        })
        .catch(e => {
          console.warn('js-tiktoken dynamic import failed:', e);
          resolve();
        });
    } catch (e) {
      console.warn('js-tiktoken initialization attempt failed:', e);
      resolve();
    }
  });

  return initializationPromise;
};

// Only initialize in browser environments
if (isSafeTiktokenEnvironment()) {
  // Lazy initialize when browser is idle
  if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
    (
      window as Window & { requestIdleCallback: (callback: () => void) => void }
    ).requestIdleCallback(() => {
      initializeTiktoken();
    });
  } else {
    // Fallback for browsers without requestIdleCallback
    setTimeout(() => {
      initializeTiktoken();
    }, 1000); // Delay initialization to not block main thread during page load
  }
}

/**
 * No need to clean up js-tiktoken as it doesn't use WASM resources,
 * but keeping this function for API compatibility
 */
export const cleanupTiktoken = () => {
  embedding_enc = null;
  assistant_enc = null;
  tiktoken = null;
  isInitializing = false;
  initializationPromise = null;
};

export const MAX_ASSISTANT_INPUT_TOKENS = 200_000;
export const MAX_EMBEDDING_INPUT_TOKENS = 8_000;

export interface Message {
  type?: 'error' | 'success';
  message?: string;
}

/**
 * Redirects to a specified path with an encoded message as a query parameter.
 * @param {('error' | 'success')} type - The type of message, either 'error' or 'success'.
 * @param {string} path - The path to redirect to.
 * @param {string} message - The message to be encoded and added as a query parameter.
 * @returns {never} This function doesn't return as it triggers a redirect.
 */
// This function is being replaced by direct redirects to avoid issues with Next.js
export function encodedRedirect(type: 'error' | 'success', path: string, message: string) {
  const url = `${path}?${type}=${encodeURIComponent(message)}`;
  return redirect(url);
}

/**
 * Updates a user's status and last_seen timestamp.
 * @param {any} supabase - The Supabase client.
 * @param {string} userId - The user's ID.
 * @param {'online' | 'offline' | 'away'} status - The status to set.
 * @returns {Promise<any>} The result of the update operation.
 */
export const updateUserStatus = async (
  supabase: {
    from: (table: string) => {
      update: (data: Record<string, unknown>) => {
        eq: (field: string, value: string) => Promise<unknown>;
      };
    };
  },
  userId: string,
  status: 'online' | 'offline' | 'away'
) => {
  return await supabase
    .from('users')
    .update({
      status,
      last_seen: new Date().toISOString(),
    })
    .eq('id', userId);
};

export const countTokens = async (text: string, assistant = false): Promise<number> => {
  // Use rough estimation for non-browser environments or edge runtime
  if (!isSafeTiktokenEnvironment()) {
    return Math.ceil(text.length / 4);
  }

  // Try to initialize tiktoken if not already done
  try {
    if (!tiktoken) {
      await initializeTiktoken();
    }

    // If initialization succeeded and we have the right encoder
    if ((assistant && assistant_enc) || (!assistant && embedding_enc)) {
      try {
        const encoder = assistant ? assistant_enc : embedding_enc;
        if (!encoder) {
          throw new Error('Encoder not available');
        }

        // Use a temporary encoder if we need to count tokens but don't want to modify our shared instances
        let tempEncoder = null;
        let count = 0;

        try {
          // For one-off operations, create a fresh encoder instead of reusing the shared one
          if (tiktoken) {
            try {
              const modelName = assistant ? 'o1' : 'text-embedding-3-large';
              tempEncoder = tiktoken.encodingForModel(modelName);
              count = tempEncoder.encode(text).length;
            } catch (modelError) {
              console.warn(
                `Error using model-specific encoder: ${modelError}. Falling back to cl100k_base.`
              );
              try {
                tempEncoder = tiktoken.getEncoding('cl100k_base');
                count = tempEncoder.encode(text).length;
              } catch (fallbackError) {
                console.warn(
                  `Error using fallback encoder: ${fallbackError}. Using shared encoder.`
                );
                count = encoder.encode(text).length;
              }
            }
          } else {
            // If tiktoken module isn't available but encoder somehow is
            count = encoder.encode(text).length;
          }

          return count;
        } finally {
          // No need to free resources with js-tiktoken
          tempEncoder = null;
        }
      } catch (encodeError) {
        console.warn('Error encoding text with js-tiktoken:', encodeError);
      }
    }
  } catch (e) {
    console.warn('Error during token counting:', e);
  }

  // Fall back to rough estimation if anything fails
  return Math.ceil(text.length / 4);
};

/**
 * Splits text into chunks that are smaller than the maximum token limit for embeddings
 * @param {string} text - The text to split
 * @returns {Promise<string[]>} Array of text chunks that are below token limit
 */
export const splitTextForEmbedding = async (text: string): Promise<string[]> => {
  const tokenCount = await countTokens(text);

  if (tokenCount <= MAX_EMBEDDING_INPUT_TOKENS) {
    return [text];
  }

  // Split roughly in half
  const halfLength = Math.floor(text.length / 2);
  const firstHalf = text.substring(0, halfLength);
  const secondHalf = text.substring(halfLength);

  // Recursively split each half
  const firstHalfChunks = await splitTextForEmbedding(firstHalf);
  const secondHalfChunks = await splitTextForEmbedding(secondHalf);

  // Combine results
  return [...firstHalfChunks, ...secondHalfChunks];
};

/**
 * Recursively summarizes text until it's below the maximum token limit for the assistant
 * @param {string} text - The text to summarize
 * @returns {Promise<string>} Summarized text below token limit
 */
export const summarizeTextForAssistant = async (text: string): Promise<string> => {
  const tokenCount = await countTokens(text, true);

  if (tokenCount <= MAX_ASSISTANT_INPUT_TOKENS) {
    return text;
  }

  // Split text into chunks and summarize each large chunk
  const chunks = await splitTextForAssistant(text);

  // If we have multiple chunks, summarize each one and then combine
  if (chunks.length > 1) {
    const summaries = await Promise.all(
      chunks.map(async chunk => {
        // Only summarize chunks that exceed the limit
        const chunkTokens = await countTokens(chunk, true);
        if (chunkTokens > MAX_ASSISTANT_INPUT_TOKENS / chunks.length) {
          return await summarizeChunk(chunk);
        }
        return chunk;
      })
    );

    const combinedSummary = summaries.join('\n\n');

    // Check if combined summaries are still too large and recursively summarize if needed
    return await summarizeTextForAssistant(combinedSummary);
  }

  // If we somehow have a single chunk that's still too large, summarize it directly
  return await summarizeChunk(text);
};

/**
 * Splits text into chunks that are manageable for summarization
 * @param {string} text - The text to split
 * @returns {Promise<string[]>} Array of text chunks
 */
export const splitTextForAssistant = async (text: string): Promise<string[]> => {
  const tokenCount = await countTokens(text, true);

  if (tokenCount <= MAX_ASSISTANT_INPUT_TOKENS) {
    return [text];
  }

  // Split by paragraphs or meaningful units if possible
  const paragraphs = text.split(/\n\s*\n/);
  if (paragraphs.length > 1) {
    // Group paragraphs into chunks that are below limit
    const chunks: string[] = [];
    let currentChunk = '';

    for (const paragraph of paragraphs) {
      const potentialChunk = currentChunk ? `${currentChunk}\n\n${paragraph}` : paragraph;
      const potentialTokens = await countTokens(potentialChunk, true);

      if (potentialTokens > MAX_ASSISTANT_INPUT_TOKENS / 2) {
        // Current chunk would be too big, save it and start a new one
        if (currentChunk) chunks.push(currentChunk);
        currentChunk = paragraph;
      } else {
        // Add to current chunk
        currentChunk = potentialChunk;
      }
    }

    // Add the final chunk
    if (currentChunk) chunks.push(currentChunk);
    return chunks;
  }

  // If no paragraphs, split by character length
  const halfLength = Math.floor(text.length / 2);
  const firstHalf = text.substring(0, halfLength);
  const secondHalf = text.substring(halfLength);

  // Recursively split each half
  const firstHalfChunks = await splitTextForAssistant(firstHalf);
  const secondHalfChunks = await splitTextForAssistant(secondHalf);

  // Combine results
  return [...firstHalfChunks, ...secondHalfChunks];
};

/**
 * Summarizes a chunk of text using the chat function
 * @param {string} chunk - The text chunk to summarize
 * @returns {Promise<string>} Summarized text
 */
export const summarizeChunk = async (chunk: string): Promise<string> => {
  const systemPrompt =
    'You are a summarization assistant. Condense the following text while preserving the key information, context, and meaning.';
  const userPrompt = `Summarize this text concisely while retaining all important details:\n\n${chunk}`;

  return await chat(systemPrompt, userPrompt);
};

/**
 * Embeds text, splitting it into chunks if necessary to stay under token limits
 * @param {string} text - The text to embed
 * @returns {Promise<number[][]>} Array of embeddings for each chunk
 */
export const embedText = async (text: string): Promise<number[][]> => {
  const chunks = await splitTextForEmbedding(text);
  const embeddings = await Promise.all(chunks.map(async chunk => await embed(chunk)));
  return embeddings;
};

export const embed = async (text: string): Promise<number[]> => {
  try {
    // Validate text input
    if (!text || text.trim() === '') {
      throw new Error('Empty text cannot be embedded');
    }

    // Ensure we have an API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('Missing OpenAI API key in environment variables');
    }

    // Explicitly configure the OpenAI client with the API key
    const openai = new OpenAI({
      apiKey,
    });

    const embedding = await openai.embeddings.create({
      model: process.env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-large',
      input: text,
      dimensions: parseInt(process.env.OPENAI_EMBEDDING_DIMENSIONS || '1536'),
    });

    // Validate the response
    if (!embedding.data || !embedding.data[0] || !embedding.data[0].embedding) {
      throw new Error('OpenAI returned an invalid embedding response');
    }

    // Check that embedding isn't all zeros (which would indicate a problem)
    const allZeros = embedding.data[0].embedding.every(val => val === 0);
    if (allZeros) {
      throw new Error('OpenAI returned an all-zero embedding, which indicates a problem');
    }

    return embedding.data[0].embedding;
  } catch (error) {
    // Log the error with details and throw it to be handled upstream
    console.error('Error generating embedding:', error);

    // Improve error message with context
    const errorMsg =
      error instanceof Error
        ? `Embedding generation failed: ${error.message}`
        : `Embedding generation failed with unknown error: ${String(error)}`;

    throw new Error(errorMsg);
  }
};

/**
 * Generates an AI response, ensuring input is within token limits
 * @param {string} system_prompt - The system prompt
 * @param {string} user_prompt - The user prompt
 * @returns {Promise<string>} The AI response
 */
export const safeChat = async (system_prompt: string, user_prompt: string): Promise<string> => {
  // Count tokens for combined input
  const combinedInput = `${system_prompt}\n\n${user_prompt}`;
  const tokenCount = await countTokens(combinedInput, true);

  if (tokenCount <= MAX_ASSISTANT_INPUT_TOKENS) {
    // Input is within limits, use as is
    return await chat(system_prompt, user_prompt);
  }

  // Input exceeds limits, summarize the user prompt
  const summarizedUserPrompt = await summarizeTextForAssistant(user_prompt);
  return await chat(system_prompt, summarizedUserPrompt);
};

export const chat = async (system_prompt: string, user_prompt: string): Promise<string> => {
  try {
    // Use the API key from environment variables
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('Missing OpenAI API key in environment variables');
    }

    // Explicitly configure the OpenAI client with the API key
    const openai = new OpenAI({
      apiKey,
    });

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_CHAT_MODEL || 'o1',
      messages: [
        { role: 'system', content: system_prompt },
        { role: 'user', content: user_prompt },
      ],
      reasoning_effort:
        (process.env.OPENAI_CHAT_MODEL_REASONING as 'low' | 'medium' | 'high' | null) || 'high',
    });

    return completion.choices[0].message.content || '';
  } catch (error) {
    console.error('Error in chat completion:', error);
    // Return a friendly message if the API call fails
    return "I'm sorry, I couldn't process that request at the moment. Please try again later.";
  }
};

// Helper function to generate embeddings for a user - CLIENT SIDE ONLY
export async function generateUserEmbeddings(
  userId: string,
  username: string,
  displayName?: string,
  bio?: string
) {
  try {
    // Validate inputs
    if (!userId || !username) {
      throw new Error('User ID and username are required for embedding generation');
    }

    // Extract words from username and display name for better matching
    const usernameWords = username.split(/\s+|_|-|\./).filter(Boolean);
    const displayNameWords = displayName ? displayName.split(/\s+/).filter(Boolean) : [];

    // Create keywords list with repetition for better search
    const keywords = [
      username, // Username is most important
      ...Array(3).fill(username), // Repeat username for emphasis
      ...usernameWords, // Individual username parts
      displayName || '', // Display name if available
      ...Array(2).fill(displayName || ''), // Repeat display name
      ...displayNameWords, // Individual display name words
    ].filter(Boolean);

    // Create enhanced, structured content text for better semantic search
    const contentText = `User: ${username} ${username} ${username}
Username: ${username} ${username}
${displayName ? `Display Name: ${displayName} ${displayName}` : ''}
${displayName ? `Name: ${displayName} ${displayName}` : ''}
Profile: ${username}
${usernameWords.map(w => `${w} ${w} ${w}`).join('\n')}
${displayNameWords.map(w => `${w} ${w} ${w}`).join('\n')}
Keywords: ${keywords.join(', ')}
${bio ? `Bio: ${bio}` : ''}
${bio ? `About: ${bio}` : ''}
${bio ? `Description: ${bio}` : ''}`;

    console.log('Generating embeddings for user:', userId);

    // Get the base URL from window.location in the browser
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

    // Only use the client-side fetch approach
    // For server components, use the server-utils.ts version instead
    const response = await fetch(`${baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: contentText,
        type: 'user',
        id: userId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Embedding API error:', errorData);
      throw new Error(
        `Failed to generate embedding for user: ${response.status} ${response.statusText}`
      );
    }

    console.log('Successfully generated user embeddings');
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error generating user embedding: ${errorMessage}`);
    return false;
  }
}

// Helper function to generate embeddings for an organization - CLIENT SIDE ONLY
export async function generateOrganizationEmbeddings(
  orgId: string,
  orgName: string,
  orgDescription?: string
) {
  try {
    // Validate inputs
    if (!orgId || !orgName) {
      throw new Error('Organization ID and name are required for embedding generation');
    }

    // Extract company name parts for better matching
    const nameParts = orgName.split(/\s+/);

    // Create extremely keyword-heavy content
    const exactOrgName = Array(10).fill(orgName).join(' ');

    // Add individual words with repetition
    const individualWords = [];
    for (const part of nameParts) {
      individualWords.push(...Array(5).fill(part));
    }

    // Build list of all variations for keywords
    const keywords = [
      ...Array(5).fill(orgName), // Full name repeated
      ...individualWords, // Individual words repeated 5x
      nameParts.join(' '), // Space-separated
      nameParts.join(', '), // Comma-separated
      nameParts.join('-'), // Hyphen-separated
      ...nameParts, // Individual words once more
    ];

    // Create content text with very heavy repetition and structured format
    const contentText = `${exactOrgName}
Organization: ${orgName} ${orgName} ${orgName}
Organization Name: ${orgName} ${orgName} ${orgName}
Name: ${orgName} ${orgName} ${orgName}
Company: ${orgName} ${orgName} ${orgName}
Business: ${orgName} ${orgName}
Title: ${orgName} ${orgName}
Brand: ${orgName} ${orgName}
Organization: ${nameParts.join(' ')} ${nameParts.join(' ')}
Name: ${nameParts.join(' ')} ${nameParts.join(' ')}
Company: ${nameParts.join(' ')} ${nameParts.join(' ')}
${nameParts.map(p => `${p} ${p} ${p} ${p} ${p}`).join('\n')}
Keywords: ${keywords.join(', ')}
Description: ${orgDescription || `Organization called ${orgName}`}
About: ${orgName}
Additional Information: ${orgName} organization
${orgDescription ? `Context: ${orgDescription}` : ``}`;

    console.log('Generating embeddings for organization:', orgId);

    // Get the base URL from window.location in the browser
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

    // Only use the client-side fetch approach
    // For server components, use the server-utils.ts version instead
    const response = await fetch(`${baseUrl}/api/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: contentText,
        type: 'organization',
        id: orgId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Embedding API error for organization:', errorData);
      throw new Error(
        `Failed to generate embedding for organization: ${response.status} ${response.statusText}`
      );
    }

    console.log('Successfully generated organization embeddings');
    return true;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error generating organization embedding: ${errorMessage}`);
    return false;
  }
}
