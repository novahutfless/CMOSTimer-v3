import { describe, it, expect, vi, afterEach } from 'vitest';
import { api, ApiError } from '../../utils/api';

describe('API Utils', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it('resolves with parsed JSON on success', async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			text: () => Promise.resolve(JSON.stringify({ token: 't', user: { id: '1', username: 'u' } }))
		});
		vi.stubGlobal('fetch', fetchMock);

		const result = await api.login({ username: 'u', password: 'p' });
		expect(result.token).toBe('t');
		expect(result.user.username).toBe('u');
	});

	it('throws ApiError on invalid JSON response', async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			status: 500,
			text: () => Promise.resolve('not-json')
		});
		vi.stubGlobal('fetch', fetchMock);

		await expect(api.login({ username: 'u', password: 'p' })).rejects.toBeInstanceOf(ApiError);
	});
});
