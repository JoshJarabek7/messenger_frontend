import { env } from '$env/dynamic/public';
import { browser } from '$app/environment';

// Use localhost:8000 for all client-side requests
export const API_BASE_URL = env.PUBLIC_API_URL || 'http://localhost:8000/api';
export const WS_BASE_URL = env.PUBLIC_WS_URL || 'ws://localhost:8000/ws';
