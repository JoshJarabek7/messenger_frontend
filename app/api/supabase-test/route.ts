import { NextResponse } from 'next/server';

import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Simple test query that should always work
    const { data, error } = await supabase
      .from('users')
      .select('count(*)', { count: 'exact', head: true });

    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      data,
      timestamp: new Date().toISOString() 
    });
  } catch (err: unknown) {
    console.error('Supabase connection error:', err);
    const error = err instanceof Error ? err : new Error('Unknown error occurred');
    return NextResponse.json({ 
      success: false, 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : 'Stack trace hidden in production'
    }, { status: 500 });
  }
}