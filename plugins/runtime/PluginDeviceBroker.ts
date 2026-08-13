import { PluginDeviceDescriptor, PluginDeviceKind, PluginDeviceRequest, PluginDeviceWriteOptions } from '../../types';

type BrowserDevice = Record<string, unknown>;
type NavigatorWithDevices = Navigator & Record<PluginDeviceKind, BrowserDevice | undefined>;
type OpenDevice = { owner: string; kind: PluginDeviceKind; device: BrowserDevice; cancelReads: Set<() => void> };

const call = async <T>(target: BrowserDevice, method: string, ...args: unknown[]): Promise<T> => {
	const fn = target[method];
	if (typeof fn !== 'function') throw new Error(`This device does not support ${method}().`);
	return await (fn as (...values: unknown[]) => Promise<T>).apply(target, args);
};

const deviceName = (device: BrowserDevice, kind: PluginDeviceKind): string =>
	String(device.productName || device.name || device.getInfo && 'Serial device' || `${kind} device`);

export class PluginDeviceBroker {
	private readonly devices = new Map<string, OpenDevice>();
	private nextId = 0;

	public supports(kind: PluginDeviceKind): boolean {
		return typeof navigator !== 'undefined' && Boolean((navigator as NavigatorWithDevices)[kind]);
	}

	public async request(owner: string, request: PluginDeviceRequest): Promise<PluginDeviceDescriptor> {
		if (!this.supports(request.kind)) throw new Error(`${request.kind} is unavailable on this target.`);
		const source = (navigator as NavigatorWithDevices)[request.kind] as BrowserDevice;
		let device: BrowserDevice;
		if (request.kind === 'serial') {
			device = await call(source, 'requestPort', request.filters?.length ? { filters: request.filters } : {});
			await call(device, 'open', { baudRate: request.baudRate || 115200 });
		} else if (request.kind === 'hid') {
			const selected = await call<BrowserDevice[]>(source, 'requestDevice', { filters: request.filters || [] });
			if (!selected[0]) throw new Error('No HID device selected.');
			device = selected[0];
			await call(device, 'open');
		} else if (request.kind === 'usb') {
			if (!request.filters?.length) throw new Error('USB device requests require at least one filter.');
			device = await call(source, 'requestDevice', { filters: request.filters });
			await call(device, 'open');
			if (request.configurationValue !== undefined) await call(device, 'selectConfiguration', request.configurationValue);
			if (request.interfaceNumber !== undefined) await call(device, 'claimInterface', request.interfaceNumber);
		} else {
			device = await call(source, 'requestDevice', request.filters?.length ? { filters: request.filters } : { acceptAllDevices: true });
			const gatt = device.gatt as BrowserDevice | undefined;
			if (gatt) await call(gatt, 'connect');
		}
		this.nextId += 1;
		const id = `device-${this.nextId}`;
		this.devices.set(id, { owner, kind: request.kind, device, cancelReads: new Set() });
		return { id, kind: request.kind, name: deviceName(device, request.kind) };
	}

	public async write(owner: string, id: string, bytes: number[], options: PluginDeviceWriteOptions = {}): Promise<void> {
		const entry = this.requireOwned(owner, id);
		const data = new Uint8Array(bytes);
		if (entry.kind === 'serial') {
			const writable = entry.device.writable as BrowserDevice | undefined;
			if (!writable) throw new Error('Serial device is not writable.');
			const writer = (writable.getWriter as (() => BrowserDevice))();
			try {
				await call(writer, 'write', data);
			} finally {
				(writer.releaseLock as (() => void) | undefined)?.();
			}
		} else if (entry.kind === 'hid') {
			await call(entry.device, 'sendReport', options.reportId || 0, data);
		} else if (entry.kind === 'usb') {
			if (!Number.isInteger(options.endpoint)) throw new Error('USB writes require an endpoint.');
			await call(entry.device, 'transferOut', options.endpoint, data);
		} else {
			if (!options.service || !options.characteristic) throw new Error('Bluetooth writes require service and characteristic UUIDs.');
			const gatt = entry.device.gatt as BrowserDevice | undefined;
			if (!gatt) throw new Error('Bluetooth GATT is unavailable.');
			const server = await call<BrowserDevice>(gatt, 'connect');
			const service = await call<BrowserDevice>(server, 'getPrimaryService', options.service);
			const characteristic = await call<BrowserDevice>(service, 'getCharacteristic', options.characteristic);
			await call(characteristic, 'writeValue', data);
		}
	}

	public async read(owner: string, id: string, options: PluginDeviceWriteOptions & { length?: number } = {}): Promise<number[]> {
		const entry = this.requireOwned(owner, id);
		const length = Number.isInteger(options.length) && options.length! > 0 && options.length! <= 65_536 ? options.length! : 64;
		let value: unknown;
		if (entry.kind === 'serial') {
			const readable = entry.device.readable as BrowserDevice | undefined;
			if (!readable) throw new Error('Serial device is not readable.');
			const reader = (readable.getReader as (() => BrowserDevice))();
			try {
				const result = await this.cancellable(entry, call<{ value?: ArrayBufferView }>(reader, 'read'), () => {
					void call(reader, 'cancel').catch(() => undefined);
				});
				value = result.value;
			} finally {
				(reader.releaseLock as (() => void) | undefined)?.();
			}
		} else if (entry.kind === 'hid') {
			let removeListener: (() => void) | undefined;
			const report = new Promise<ArrayBufferView>((resolve, reject) => {
				const timeout = setTimeout(() => reject(new Error('Timed out waiting for a HID input report.')), 10_000);
				const listener = (event: Event & { data?: ArrayBufferView }): void => {
					clearTimeout(timeout);
					removeListener?.();
					if (event.data) resolve(event.data); else reject(new Error('HID report contained no data.'));
				};
				removeListener = (): void => {
					clearTimeout(timeout);
					(entry.device.removeEventListener as ((name: string, callback: EventListener) => void) | undefined)?.('inputreport', listener as EventListener);
				};
				const add = entry.device.addEventListener as ((name: string, callback: EventListener) => void) | undefined;
				if (!add) reject(new Error('HID input reports are unavailable.')); else add('inputreport', listener as EventListener);
			});
			value = await this.cancellable(entry, report, () => removeListener?.()).finally(() => removeListener?.());
		} else if (entry.kind === 'usb') {
			if (!Number.isInteger(options.endpoint)) throw new Error('USB reads require an endpoint.');
			const result = await this.cancellable(entry, call<{ data?: ArrayBufferView }>(entry.device, 'transferIn', options.endpoint, length));
			value = result.data;
		} else {
			if (!options.service || !options.characteristic) throw new Error('Bluetooth reads require service and characteristic UUIDs.');
			const gatt = entry.device.gatt as BrowserDevice | undefined;
			if (!gatt) throw new Error('Bluetooth GATT is unavailable.');
			const server = await call<BrowserDevice>(gatt, 'connect');
			const service = await call<BrowserDevice>(server, 'getPrimaryService', options.service);
			const characteristic = await call<BrowserDevice>(service, 'getCharacteristic', options.characteristic);
			value = await this.cancellable(entry, call<ArrayBufferView>(characteristic, 'readValue'));
		}
		if (!ArrayBuffer.isView(value)) return [];
		return Array.from(new Uint8Array(value.buffer, value.byteOffset, value.byteLength));
	}

	public async close(owner: string, id: string): Promise<void> {
		const entry = this.requireOwned(owner, id);
		this.devices.delete(id);
		entry.cancelReads.forEach(cancel => cancel());
		entry.cancelReads.clear();
		if (entry.kind === 'bluetooth') {
			const gatt = entry.device.gatt as BrowserDevice | undefined;
			if (gatt && typeof gatt.disconnect === 'function') (gatt.disconnect as () => void)();
		} else if (typeof entry.device.close === 'function') await call(entry.device, 'close');
	}

	public async closeOwner(owner: string): Promise<void> {
		const ids = Array.from(this.devices, ([id, entry]) => entry.owner === owner ? id : null).filter((id): id is string => id !== null);
		await Promise.allSettled(ids.map(id => this.close(owner, id)));
	}

	private requireOwned(owner: string, id: string): OpenDevice {
		const entry = this.devices.get(id);
		if (!entry || entry.owner !== owner) throw new Error(`Unknown device "${id}".`);
		return entry;
	}

	private cancellable<T>(entry: OpenDevice, operation: Promise<T>, cancelOperation?: () => void): Promise<T> {
		return new Promise<T>((resolve, reject) => {
			let settled = false;
			const finish = (callback: () => void): void => {
				if (settled) return;
				settled = true;
				entry.cancelReads.delete(cancel);
				callback();
			};
			const cancel = (): void => finish(() => {
				cancelOperation?.();
				reject(new Error('Device read was cancelled because the plugin or device closed.'));
			});
			entry.cancelReads.add(cancel);
			operation.then(value => finish(() => resolve(value)), error => finish(() => reject(error)));
		});
	}
}

export const pluginDeviceBroker = new PluginDeviceBroker();
