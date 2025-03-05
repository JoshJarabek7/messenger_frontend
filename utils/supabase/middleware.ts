import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

import { updateUserStatus } from '@/utils/middleware-utils';

// Activity timeout in milliseconds (5 minutes)
const ACTIVITY_TIMEOUT = 5 * 60 * 1000;

export const updateSession = async (request: NextRequest) => {
  try {
    // Create an unmodified response
    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
      }
    );

    // This will refresh session if expired - required for Server Components
    // https://supabase.com/docs/guides/auth/server-side/nextjs
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    // Only update user status if we have a valid session and user
    if (user && !userError) {
      // Get user data to check current status
      const { data: userData } = await supabase
        .from('users')
        .select('status, last_seen')
        .eq('id', user.id)
        .single();

      // Skip API routes and static assets
      const isApiOrStaticRoute =
        request.nextUrl.pathname.startsWith('/api') ||
        request.nextUrl.pathname.startsWith('/_next');

      if (userData && !isApiOrStaticRoute) {
        const now = new Date();
        const lastSeen = userData.last_seen ? new Date(userData.last_seen) : null;

        try {
          // If this is a page load and not just an API call, update the last_seen time
          if (!isApiOrStaticRoute) {
            await updateUserStatus(supabase, user.id, 'online');
          }
          // If user was away/offline and is now active, update status to online
          else if (userData.status !== 'online' && lastSeen) {
            await updateUserStatus(supabase, user.id, 'online');
          }
          // If user was inactive for more than the timeout, mark as away
          else if (lastSeen && now.getTime() - lastSeen.getTime() > ACTIVITY_TIMEOUT) {
            await updateUserStatus(supabase, user.id, 'away');
          }
        } catch (statusError) {
          console.error('Error updating user status:', statusError);
          // Continue with the response even if status update fails
        }
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
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }
};
