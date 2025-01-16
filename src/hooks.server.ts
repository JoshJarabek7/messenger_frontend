import { redirect, type Handle } from '@sveltejs/kit';
import { API_BASE_URL } from '$lib/config.ts';
import { building } from '$app/environment';

const protectedRoutes = ['/dashboard'];
const authRoutes = ['/', '/register'];

// For server-side requests in Docker, use direct backend URL
const BACKEND_URL = 'http://backend:8000/api';

async function verifyToken(accessToken: string) {
	try {
		const response = await fetch(`${BACKEND_URL}/auth/verify`, {
			credentials: 'include',
			headers: {
				Cookie: `access_token=${accessToken}`
			}
		});
		return response.ok;
	} catch (error) {
		console.error('Token verification failed:', error);
		return false;
	}
}

export const handle: Handle = async ({ event, resolve }) => {
	// Skip auth check during build time
	if (building) {
		return await resolve(event);
	}

	const { cookies, url } = event;
	const accessToken = cookies.get('access_token');
	const currentPath = url.pathname;

	// Skip auth for API health checks
	if (currentPath === '/health') {
		return await resolve(event);
	}

	try {
		// Handle protected routes
		if (protectedRoutes.some((route) => currentPath.startsWith(route))) {
			if (!accessToken || !(await verifyToken(accessToken))) {
				// Clear invalid token
				cookies.delete('access_token', { path: '/' });
				throw redirect(302, '/');
			}
		}

		// Handle auth routes
		if (authRoutes.includes(currentPath) && accessToken) {
			const isValid = await verifyToken(accessToken);
			if (isValid) {
				throw redirect(302, '/dashboard');
			} else {
				// Clear invalid token but don't redirect
				cookies.delete('access_token', { path: '/' });
			}
		}

		return await resolve(event);
	} catch (error) {
		if (error instanceof Response && error.status === 302) {
			throw error; // Re-throw redirect responses
		}

		// For any other errors, clear the token and return to root without redirecting
		cookies.delete('access_token', { path: '/' });
		return await resolve(event);
	}
};
