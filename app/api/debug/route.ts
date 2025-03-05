import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  // Check Supabase environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  // Do not expose the actual keys, just check if they're defined
  return NextResponse.json({
    environment: process.env.NODE_ENV,
    supabase: {
      url: !!supabaseUrl,
      anonKey: !!supabaseAnonKey,
      serviceKey: !!supabaseServiceKey,
      urlLength: supabaseUrl?.length || 0,
      anonKeyLength: supabaseAnonKey?.length || 0,
      serviceKeyLength: supabaseServiceKey?.length || 0,
    },
    vercel: !!process.env.VERCEL,
    vercelEnv: process.env.VERCEL_ENV,
    region: process.env.VERCEL_REGION,
    time: new Date().toISOString(),
  });
}