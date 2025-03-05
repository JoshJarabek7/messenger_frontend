import { NextRequest } from 'next/server';

import { deleteDirectMessageAction } from '@/app/actions';

export async function POST(req: NextRequest) {
  console.log('DM Delete API Route: Request received');

  try {
    // Parse the request body
    const body = await req.json();
    console.log('DM Delete API Route: Request body:', body);
    const { conversationId } = body;

    if (!conversationId) {
      console.log('DM Delete API Route: Missing conversation ID');
      return new Response(
        JSON.stringify({ success: false, error: 'Conversation ID is required' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    console.log(
      `DM Delete API Route: Calling deleteDirectMessageAction with conversationId: ${conversationId}`
    );

    // Call the action to delete the conversation
    const result = await deleteDirectMessageAction(conversationId);
    console.log('DM Delete API Route: Action result:', result);

    if (!result.success) {
      console.log(`DM Delete API Route: Action failed: ${result.error}`);
      return new Response(JSON.stringify(result), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log(`DM Delete API Route: Success, redirecting to ${result.redirect}`);

    // Return success response with redirect URL
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in delete conversation route:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process request',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
