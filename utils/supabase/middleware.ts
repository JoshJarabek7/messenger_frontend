import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

import { updateUserStatus } from '@/utils/middleware-utils';

// Activity timeout in milliseconds (5 minutes)
const ACTIVITY_TIMEOUT = 5 * 60 * 1000;

export const updateSession = async (request: NextRequest) => {
  try {
    // Skip debug and test API routes entirely to prevent middleware issues
    if (request.nextUrl.pathname.startsWith('/api/debug') || 
        request.nextUrl.pathname.startsWith('/api/supabase-test')) {
      return NextResponse.next();
    }

    // Skip processing for API routes and static assets
    const isApiOrStaticRoute =
      request.nextUrl.pathname.startsWith('/api') ||
      request.nextUrl.pathname.startsWith('/_next');

    // Create an unmodified response
    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

    // Check if Supabase environment variables are available
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase environment variables in middleware');
      return response;
    }

    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
            response = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
        global: {
          fetch: fetch.bind(globalThis),
        },
        auth: {
          flowType: 'pkce',
          detectSessionInUrl: true,
          persistSession: true,
          autoRefreshToken: true,
        },
      }
    );

    // This will refresh session if expired - required for Server Components
    // https://supabase.com/docs/guides/auth/server-side/nextjs
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    // Only update user status if:
    // 1. We have a valid user
    // 2. No errors getting the user
    // 3. Not an API or static route
    // 4. Not in development mode (to reduce noise during development)
    if (user && 
        !userError && 
        !isApiOrStaticRoute && 
        process.env.NODE_ENV === 'production') {
      try {
        // Get user data to check current status
        const { data: userData } = await supabase
          .from('users')
          .select('status, last_seen')
          .eq('id', user.id)
          .single();

        if (userData) {
          const now = new Date();
          const lastSeen = userData.last_seen ? new Date(userData.last_seen) : null;

          // If this is a page load, update the last_seen time
          await updateUserStatus(supabase, user.id, 'online');
          
          // If user was away/offline and is now active, update status to online
          if (userData.status !== 'online' && lastSeen) {
            await updateUserStatus(supabase, user.id, 'online');
          }
          // If user was inactive for more than the timeout, mark as away
          else if (lastSeen && now.getTime() - lastSeen.getTime() > ACTIVITY_TIMEOUT) {
            await updateUserStatus(supabase, user.id, 'away');
          }
        }
      } catch (statusError) {
        console.error('Error updating user status:', statusError);
        // Continue with the response even if status update fails
      }
    }

    // protected routes
    if (request.nextUrl.pathname.startsWith('/protected') && userError) {
      return NextResponse.redirect(new URL('/sign-in', request.url));
    }

    if (request.nextUrl.pathname === '/' && !userError) {
      return NextResponse.redirect(new URL('/protected', request.url));
    }

    return response;
  } catch (e) {
    console.error('Middleware error:', e);
    // Don't fail the request due to middleware error
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }
};
