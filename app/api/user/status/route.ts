import { NextRequest, NextResponse } from 'next/server';

import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  try {
    // Parse the JSON body
    const body = await request.json();
    const { status, userId } = body;

    // Validate input
    if (!status || !userId || !['online', 'offline', 'away'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status or user ID' }, { status: 400 });
    }

    // Update the user status
    const { error } = await supabase
      .from('users')
      .update({
        status,
        last_seen: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      console.error('Error updating user status:', error);
      return NextResponse.json({ error: 'Failed to update status' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing status update:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// For navigator.sendBeacon() which uses OPTIONS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
