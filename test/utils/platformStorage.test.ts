import { afterEach, describe, expect, it, vi } from 'vitest';
import { storage, storageStatus } from '../../utils/platformStorage';

describe('platform storage writes', () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it('reports quota or blocked-storage failures to callers', () => {
		vi.stubGlobal('window', {
			localStorage: {
				getItem: vi.fn(),
				setItem: vi.fn(() => {
					throw new DOMException('Quota exceeded', 'QuotaExceededError');
				}),
				removeItem: vi.fn()
			}
		});

		expect(storage.setItem('cmostimer_sessions', 'data')).toBe(false);
		expect(storageStatus.isBrowserStorageWritable()).toBe(false);
	});

	it('reports removal failures instead of silently treating them as successful', () => {
		vi.stubGlobal('window', {
			localStorage: {
				getItem: vi.fn(),
				setItem: vi.fn(),
				removeItem: vi.fn(() => {
					throw new DOMException('Blocked', 'SecurityError');
				})
			}
		});

		expect(storage.removeItem('cmostimer_sessions')).toBe(false);
		expect(storageStatus.isBrowserStorageWritable()).toBe(false);
	});
});
