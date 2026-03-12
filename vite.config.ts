import path from 'path';
import fs from 'fs';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, '.', '');
	const packageJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'package.json'), 'utf8')) as { version?: string };
	const appVersion = packageJson.version || '0.0.0';
	return {
		server: {
			port: 3000,
			host: '0.0.0.0',
		},
		plugins: [react()],
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
