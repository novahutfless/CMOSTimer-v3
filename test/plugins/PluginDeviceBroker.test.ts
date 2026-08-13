import { afterEach, describe, expect, it, vi } from 'vitest';
import { PluginDeviceBroker } from '../../plugins/runtime/PluginDeviceBroker';

afterEach(() => vi.unstubAllGlobals());

describe('PluginDeviceBroker', () => {
	it('mediates serial IO and enforces device ownership', async () => {
		const write = vi.fn(async () => undefined);
		const close = vi.fn(async () => undefined);
		const port = {
			getInfo: (): Record<string, never> => ({}),
			open: vi.fn(async () => undefined),
			close,
			writable: { getWriter: (): { write: typeof write; releaseLock: ReturnType<typeof vi.fn> } => ({ write, releaseLock: vi.fn() }) },
			readable: { getReader: (): { read: () => Promise<{ value: Uint8Array }>; releaseLock: ReturnType<typeof vi.fn> } => ({ read: async (): Promise<{ value: Uint8Array }> => ({ value: new Uint8Array([1, 2, 3]) }), releaseLock: vi.fn() }) }
		};
		vi.stubGlobal('navigator', { serial: { requestPort: vi.fn(async () => port) } });
		const broker = new PluginDeviceBroker();
		expect(broker.supports('serial')).toBe(true);
		const descriptor = await broker.request('owner', { kind: 'serial', baudRate: 9600 });
		await broker.write('owner', descriptor.id, [4, 5]);
		expect(write).toHaveBeenCalledWith(new Uint8Array([4, 5]));
		await expect(broker.read('other', descriptor.id)).rejects.toThrow('Unknown device');
		expect(await broker.read('owner', descriptor.id)).toEqual([1, 2, 3]);
		await broker.closeOwner('owner');
		expect(close).toHaveBeenCalled();
	});
});
