import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	logLevel: 'info',
	server: {
		host: true,
		port: 5173,
		strictPort: true,
		hmr: {
			protocol: 'ws',
			host: 'localhost',
			clientPort: 80
		}
	}
});
