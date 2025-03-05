import { NextResponse } from 'next/server';

import { Database } from '@/types/supabase';
import { createClient } from '@/utils/supabase/server';
import {
  safeChat,
  summarizeTextForAssistant,
  countTokens,
  MAX_ASSISTANT_INPUT_TOKENS,
} from '@/utils/utils';

// Real implementation using OpenAI for AI response generation
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
    const {
      messageId,
      mentionedUserId,
      channelId,
      conversationId,
      parentMessageId,
      // content is unused but part of the API
      _content,
    } = await request.json();

    if (!messageId || !mentionedUserId || (!channelId && !conversationId)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get the mentioned user's AI persona prompt and bio
    const { data: mentionedUser } = (await supabase
      .from('users')
      .select('username, display_name, ai_persona_prompt, bio')
      .eq('id', mentionedUserId)
      .single()) as {
      data: Pick<
        Database['public']['Tables']['users']['Row'],
        'username' | 'display_name' | 'ai_persona_prompt' | 'bio'
      > | null;
    };

    if (!mentionedUser || !mentionedUser.ai_persona_prompt) {
      return NextResponse.json({ error: 'User has no AI persona configured' }, { status: 400 });
    }

    const persona = mentionedUser.ai_persona_prompt;
    const displayName = mentionedUser.display_name || mentionedUser.username;

    // Gather context for the AI response
    let context = '';

    // 1. Get the current message for context
    const { data: currentMessage } = await supabase
      .from('messages')
      .select('content, sender:sender_id(username, display_name)')
      .eq('id', messageId)
      .single();

    if (currentMessage && currentMessage.sender) {
      // The "sender" field contains a user object with username and display_name
      const sender = currentMessage.sender as unknown as {
        username: string;
        display_name: string | null;
      };
      const senderName = sender.display_name || sender.username;
      context += `${senderName} said: "${currentMessage.content}"\n\n`;
    }

    // 2. Get previous messages for context
    // First, ensure we have proper context about thread structure
    let parentMessage;
    if (parentMessageId) {
      // If in thread, get parent message first for proper context
      const { data: parent } = await supabase
        .from('messages')
        .select('content, created_at, sender:sender_id(username, display_name), is_ai_generated')
        .eq('id', parentMessageId)
        .single();

      if (parent) {
        parentMessage = parent;
      }
    }

    // Set up query for message context
    let query = supabase
      .from('messages')
      .select('content, created_at, sender:sender_id(username, display_name), is_ai_generated')
      .order('created_at', { ascending: false })
      .limit(10); // Limit to recent messages

    if (channelId) {
      query = query.eq('channel_id', channelId);
    } else if (conversationId) {
      query = query.eq('conversation_id', conversationId);
    }

    // If we're in a thread, get messages from that thread
    // Otherwise get top-level messages
    if (parentMessageId) {
      query = query.eq('parent_message_id', parentMessageId);
    } else {
      query = query.is('parent_message_id', null); // Only get top-level messages
    }

    const { data: previousMessages } = await query;

    // Add the parent message first if we're in a thread
    if (parentMessageId && parentMessage && parentMessage.sender) {
      const sender = parentMessage.sender as unknown as {
        username: string;
        display_name: string | null;
      };
      const senderName = sender.display_name || sender.username;
      const prefix = parentMessage.is_ai_generated ? '[AI Avatar] ' : '';

      context += 'Thread started with:\n';
      context += `${prefix}${senderName}: "${parentMessage.content}"\n\n`;
    }

    // Add recent conversation messages
    if (previousMessages && previousMessages.length > 0) {
      context += parentMessageId ? 'Recent replies in thread:\n' : 'Recent conversation:\n';

      // Add in reverse chronological order (oldest first)
      for (let i = previousMessages.length - 1; i >= 0; i--) {
        const msg = previousMessages[i];
        if (msg.sender) {
          // Convert the sender to the expected type with username and display_name
          const sender = msg.sender as unknown as { username: string; display_name: string | null };
          const senderName = sender.display_name || sender.username;
          const prefix = msg.is_ai_generated ? '[AI Avatar] ' : '';
          context += `${prefix}${senderName}: "${msg.content}"\n`;
        }
      }
      context += '\n';
    }

    // 3. Get user's past messages to match their writing style
    const { data: userMessages } = await supabase
      .from('messages')
      .select('content')
      .eq('sender_id', mentionedUserId)
      .eq('is_ai_generated', false) // Only get real messages from the user, not AI-generated ones
      .order('created_at', { ascending: false })
      .limit(10);

    if (userMessages && userMessages.length > 0) {
      context += `Examples of ${displayName}'s past messages:\n`;
      userMessages.forEach(msg => {
        context += `- "${msg.content}"\n`;
      });
      context += '\n';
    }

    // Build system prompt with persona information
    // Include user's bio in the system prompt if available
    const userBio = mentionedUser.bio ? `Their bio: "${mentionedUser.bio}"` : '';

    const systemPrompt = `You are acting as an AI avatar for a user named ${displayName} who is currently offline. You should respond in a way that accurately represents them based on their persona description, bio, and past messages.

Their persona description is: "${persona}"
${userBio}

Your job is to respond to messages mentioning them in a way that's helpful and matches their communication style. The response should feel like it's coming from ${displayName}, not from an AI assistant.

Some key points:
- Don't say "As an AI" or "As ${displayName}'s AI avatar" - speak directly as if you are them
- Don't apologize for being offline or mention that you're responding on their behalf
- Match their writing style, tone, and knowledge level as shown in their persona description, bio, and past messages
- Incorporate personal details and preferences from their bio when relevant
- Keep responses concise and conversational
- Only answer based on the context provided, persona description, and bio`;

    // Build user prompt with context and current message
    const userPrompt = `Based on the conversation context and ${displayName}'s persona, please provide a response from ${displayName} to the most recent message.

CONTEXT:
${context}

Respond naturally as ${displayName} would.`;

    // Check if input will be too large and summarize if necessary
    const combinedText = systemPrompt + '\n\n' + userPrompt;
    const tokenCount = await countTokens(combinedText, true);

    let aiResponse;

    if (tokenCount > MAX_ASSISTANT_INPUT_TOKENS) {
      console.log(`Input too large (${tokenCount} tokens), summarizing context...`);
      const summarizedContext = await summarizeTextForAssistant(context);

      // Build a more compact user prompt
      const compactUserPrompt = `Respond as ${displayName} to the recent message.

CONTEXT (summarized):
${summarizedContext}

Respond naturally as ${displayName} would.`;

      aiResponse = await safeChat(systemPrompt, compactUserPrompt);
    } else {
      // Input is within limits, generate response directly
      aiResponse = await safeChat(systemPrompt, userPrompt);
    }

    // Create the AI response message
    const { data: responseMessage, error } = await supabase
      .from('messages')
      .insert({
        content: aiResponse,
        sender_id: mentionedUserId,
        channel_id: channelId,
        conversation_id: conversationId,
        parent_message_id: parentMessageId || null,
        is_ai_generated: true,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, message: responseMessage });
  } catch (error) {
    console.error('Error in AI response endpoint:', error);
    return NextResponse.json({ error: 'Failed to generate AI response' }, { status: 500 });
  }
}
