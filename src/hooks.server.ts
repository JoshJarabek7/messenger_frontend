import { redirect, type Handle } from '@sveltejs/kit';
import { API_BASE_URL } from '$lib/config.ts';

const protectedRoutes = ["/dashboard"];
const authRoutes = ["/", "/register"];

export const handle: Handle = async ({ event, resolve }) => {
    const { cookies, url } = event;
    const accessToken = cookies.get('access_token');
    const currentPath = url.pathname;

    // Verify auth for protected routes
    if (protectedRoutes.some(route => currentPath.startsWith(route))) {
        if (!accessToken) {
            throw redirect(302, '/');
        }

        try {
            const response = await fetch(`${API_BASE_URL}/auth/verify`, {
                headers: {
                    Cookie: `access_token=${accessToken}`
                }
            });

            if (!response.ok) {
                throw redirect(302, '/');
            }
        } catch {
            throw redirect(302, '/');
        }
    }

    // Redirect authenticated users away from auth routes
    if (authRoutes.includes(currentPath) && accessToken) {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/verify`, {
                headers: {
                    Cookie: `access_token=${accessToken}`
                }
            });

            if (response.ok) {
                throw redirect(302, '/dashboard');
            }
        } catch {
            // If verification fails, allow access to auth routes
        }
    }

    return await resolve(event);
}; 