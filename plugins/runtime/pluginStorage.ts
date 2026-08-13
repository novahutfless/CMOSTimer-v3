import { PluginStorageApi } from '../../types';
import { storage } from '../../utils/platformStorage';

const normalizeStorageKey = (key: string): string => {
	if (typeof key !== 'string' || !key.trim()) throw new Error('Plugin storage key must be a non-empty string.');
	return key.trim();
};

export const createPluginStorage = (pluginId: string): PluginStorageApi => {
	const prefix = `cmostimer_plugin_data:${pluginId}:`;
	return {
		get: <T = unknown>(key: string, fallback?: T): T | undefined => {
			const raw = storage.getItem(`${prefix}${normalizeStorageKey(key)}`);
			if (raw === null) return fallback;
			try {
				return JSON.parse(raw) as T;
			} catch {
				return fallback;
			}
		},
		set: (key, value): void => {
			const serialized = JSON.stringify(value);
			if (serialized === undefined) throw new Error('Plugin storage values must be JSON-serializable.');
			storage.setItem(`${prefix}${normalizeStorageKey(key)}`, serialized);
		},
		remove: (key): void => storage.removeItem(`${prefix}${normalizeStorageKey(key)}`)
	};
};
