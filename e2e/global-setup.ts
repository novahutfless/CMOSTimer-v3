import type { FullConfig } from '@playwright/test';
import { build, preview } from 'vite';

export default async function globalSetup(_config: FullConfig): Promise<() => Promise<void>> {
	await build();
	const server = await preview({
		preview: {
			host: '127.0.0.1',
			port: 4173,
			strictPort: true,
		},
	});

	return async () => {
		await new Promise<void>((resolve, reject) => {
			server.httpServer.close(error => error ? reject(error) : resolve());
		});
	};
}
