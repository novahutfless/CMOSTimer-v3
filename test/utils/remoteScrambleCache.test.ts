import { beforeEach, describe, expect, it } from 'vitest';
import { storeCachedScrambles, takeCachedScramble } from '../../utils/remoteScrambleCache';

const values = new Map<string, string>();

beforeEach(() => {
	values.clear();
	Object.defineProperty(globalThis, 'window', {
		configurable: true,
		value: { localStorage: {
			getItem: (key: string): string | null => values.get(key) ?? null,
			setItem: (key: string, value: string): void => {
				values.set(key, value);
			},
			removeItem: (key: string): void => {
				values.delete(key);
			}
		} }
	});
});

describe('remote scramble cache', () => {
	it('persists and consumes an audited scramble without a network dependency', () => {
		storeCachedScrambles({
			333: [{ moves: ['R', 'U'], seed: 42, generator: 'tnoodle@test', generatedAt: 1234 }]
		});
		expect(takeCachedScramble('333')).toEqual({
			scramble: [['R', 'U']], seed: 42, generator: 'tnoodle@test', generatedAt: 1234
		});
		expect(takeCachedScramble('333')).toBeNull();
	});

	it('does not partially consume a relay', () => {
		storeCachedScrambles({
			333: [{ moves: ['R'], seed: 1, generator: 'cache', generatedAt: 1 }]
		});
		expect(takeCachedScramble(['333', '222'])).toBeNull();
		expect(takeCachedScramble('333')?.scramble).toEqual([['R']]);
	});

	it('does not invent a reproducibility seed for an external generator', () => {
		storeCachedScrambles({
			333: [{ moves: ['F2'], seed: null, generator: 'tnoodle@test', generatedAt: 2 }]
		});
		expect(takeCachedScramble('333')).not.toHaveProperty('seed');
	});
});
