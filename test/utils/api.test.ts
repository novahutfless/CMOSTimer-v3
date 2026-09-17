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

	it('sends guest creation and claiming requests through the normal API contract', async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			text: () => Promise.resolve(JSON.stringify({ token: 'guest-token', user: { id: 'g1', username: 'guest-g1', isGuest: true } }))
		});
		vi.stubGlobal('fetch', fetchMock);

		await api.createGuest();
		await api.claimGuest('guest-token', { username: 'account', password: 'secret', email: 'a@example.com' });

		expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ route: 'create_guest' });
		expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toMatchObject({ route: 'claim_guest', authToken: 'guest-token', username: 'account' });
		expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe('Bearer guest-token');
	});
});
