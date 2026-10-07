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

    it('requests acknowledgement-only sync responses and keeps full snapshots as the default', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true, status: 200,
            text: () => Promise.resolve(JSON.stringify({ success: true, syncedAt: 123 }))
        });
        vi.stubGlobal('fetch', fetchMock);
        const result = await api.sync('token', [], 0, false);
        expect(result).toEqual({ success: true, syncedAt: 123 });
        expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ route: 'sync', includeData: false, authToken: 'token' });
        await api.sync('token', [], 0);
        expect(JSON.parse(fetchMock.mock.calls[1][1].body).includeData).toBe(true);
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

	it('rejects invalid account fields before fetch', async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);

		await expect(api.register({ username: 'ab', password: '123456', email: 'a@example.com' })).rejects.toBeInstanceOf(ApiError);
		await expect(api.claimGuest('token', { username: 'account', password: 'short', email: 'not-an-email' })).rejects.toBeInstanceOf(ApiError);
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('rejects oversized requests before fetch', async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);

		await expect(api.createGuest({ oversized: 'x'.repeat(2 * 1024 * 1024) } as never)).rejects.toMatchObject({ status: 413 });
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('rejects invalid registry packages before fetch', async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);

		await expect(api.submitRegistryPlugin('token', {
			format: 'cmostimer-plugin', formatVersion: 1,
			plugin: { id: 'invalid id', name: 'Plugin', version: '1.0.0', apiVersion: '2.4.0', code: '// valid', enabled: false }
		})).rejects.toBeInstanceOf(ApiError);
		expect(fetchMock).not.toHaveBeenCalled();
	});
});
