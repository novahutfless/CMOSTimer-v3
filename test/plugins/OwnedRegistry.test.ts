import { describe, expect, it, vi } from 'vitest';
import { OwnedRegistry } from '../../plugins/runtime/OwnedRegistry';

describe('OwnedRegistry', () => {
	it('prevents one plugin from replacing another plugin registration', () => {
		const registry = new OwnedRegistry<number>({ kind: 'test item' });
		registry.register('one', 'shared', 1);
		expect(() => registry.register('two', 'shared', 2)).toThrow(/already owned/);
		expect(registry.get('shared')).toBe(1);
	});

	it('removes only entries owned by the requested plugin', () => {
		const removed = vi.fn();
		const registry = new OwnedRegistry<number>({ kind: 'test item', onRemove: removed });
		registry.register('one', 'a', 1);
		registry.register('two', 'b', 2);
		registry.unregisterOwner('one');
		expect(registry.get('a')).toBeUndefined();
		expect(registry.get('b')).toBe(2);
		expect(removed).toHaveBeenCalledWith(1);
	});
});
