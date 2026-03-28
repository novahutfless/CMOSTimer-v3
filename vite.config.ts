import path from 'path';
import fs from 'fs';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, '.', '');
	const packageJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf8')) as { version?: string };
	const appVersion = packageJson.version || '0.0.0';
	const rawBasePath = env.VITE_BASE_PATH?.trim();
	const base = rawBasePath && rawBasePath.length > 0
		? (rawBasePath.endsWith('/') ? rawBasePath : `${rawBasePath}/`)
		: './';
	return {
		base,
		server: {
			port: 3000,
			host: '0.0.0.0',
		},
		plugins: [react()],
		build: {
			chunkSizeWarningLimit: 700,
			rollupOptions: {
				output: {
					manualChunks(id) {
						if (!id.includes('node_modules')) return undefined;

						if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/')) {
							return 'vendor-react';
						}

						if (id.includes('node_modules/three/examples/')) {
							return 'vendor-three-examples';
						}

						if (id.includes('node_modules/three/')) {
							return 'vendor-three-core';
						}

						if (id.includes('node_modules/@react-three/fiber/')) {
							return 'vendor-r3f';
						}

						if (id.includes('node_modules/@react-three/drei/')) {
							return 'vendor-r3f';
						}

						if (id.includes('node_modules/recharts/')) {
							return 'vendor-charts';
						}

						if (id.includes('node_modules/lucide-react/')) {
							return 'vendor-icons';
						}

						return 'vendor-misc';
					}
				}
			}
		},
		define: {
			__APP_VERSION__: JSON.stringify(appVersion),
			'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
			'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
		},
		resolve: {
			alias: {
				'@': path.resolve(__dirname, '.'),
			}
		}
	};
});
