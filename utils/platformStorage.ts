type NativeStorageBackend = {
	getItem: (key: string) => Promise<string | null>;
	setItem: (key: string, value: string) => Promise<void>;
	removeItem: (key: string) => Promise<void>;
};

const NATIVE_KEY_SET = new Set<string>([
	'cubetime_sessions',
	'cubetime_solves',
	'cubetime_current_session',
	'cubetime_goals',
	'cubetime_plugins_state',
	'cubetime_plugins',
	'cubetime_stats_config',
	'cubetime_settings',
	'cubetime_sync_queue',
	'cubetime_token',
	'cubetime_user',
	'cubetime_virtual_camera',
]);

let nativeBackend: NativeStorageBackend | null = null;

const isBrowserStorageAvailable = (): boolean => {
	try {
		return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
	} catch {
		return false;
	}
};

const optionalImport = async (moduleName: string): Promise<any> => {
	return import(/* @vite-ignore */ moduleName);
};

const isCapacitorNative = (): boolean => {
	try {
		return typeof window !== 'undefined' && !!window.Capacitor?.isNativePlatform?.();
	} catch {
		return false;
	}
};

const isTauriRuntime = (): boolean => {
	if (typeof window === 'undefined') return false;
	const w = window as unknown as Record<string, unknown>;
	return typeof w.__TAURI__ !== 'undefined' || typeof w.__TAURI_INTERNALS__ !== 'undefined';
};

const createCapacitorBackend = async (): Promise<NativeStorageBackend | null> => {
	try {
		const { Preferences } = await optionalImport('@capacitor/preferences');
		return {
			getItem: async (key: string): Promise<string | null> => {
				const result = await Preferences.get({ key });
				return result.value ?? null;
			},
			setItem: async (key: string, value: string): Promise<void> => {
				await Preferences.set({ key, value });
			},
			removeItem: async (key: string): Promise<void> => {
				await Preferences.remove({ key });
			}
		};
	} catch {
		return null;
	}
};

const createTauriBackend = async (): Promise<NativeStorageBackend | null> => {
	try {
		const mod = await optionalImport('@tauri-apps/plugin-store');
		const StoreCtor = mod.Store;
		const store = await StoreCtor.load('cmos-storage.json');
		return {
			getItem: async (key: string): Promise<string | null> => {
				const value = await store.get(key);
				return typeof value === 'string' ? value : null;
			},
			setItem: async (key: string, value: string): Promise<void> => {
				await store.set(key, value);
				await store.save();
			},
			removeItem: async (key: string): Promise<void> => {
				await store.delete(key);
				await store.save();
			}
		};
	} catch {
		return null;
	}
};

const syncNativeKeysToBrowserStorage = async (): Promise<void> => {
	if (!nativeBackend || !isBrowserStorageAvailable()) return;
	for (const key of NATIVE_KEY_SET) {
		try {
			const value = await nativeBackend.getItem(key);
			if (value !== null) window.localStorage.setItem(key, value);
		} catch {
			// Ignore backend sync errors and keep browser storage behavior.
		}
	}
};

export const initializePlatformStorage = async (): Promise<void> => {
	if (!isBrowserStorageAvailable()) return;
	if (isCapacitorNative()) {
		nativeBackend = await createCapacitorBackend();
	} else if (isTauriRuntime()) {
		nativeBackend = await createTauriBackend();
	}
	await syncNativeKeysToBrowserStorage();
};

export const storage = {
	getItem(key: string): string | null {
		if (!isBrowserStorageAvailable()) return null;
		return window.localStorage.getItem(key);
	},
	setItem(key: string, value: string): void {
		if (!isBrowserStorageAvailable()) return;
		window.localStorage.setItem(key, value);
		NATIVE_KEY_SET.add(key);
		if (nativeBackend) {
			void nativeBackend.setItem(key, value).catch(() => undefined);
		}
	},
	removeItem(key: string): void {
		if (!isBrowserStorageAvailable()) return;
		window.localStorage.removeItem(key);
		NATIVE_KEY_SET.add(key);
		if (nativeBackend) {
			void nativeBackend.removeItem(key).catch(() => undefined);
		}
	}
};

declare global {
	interface Window {
		__TAURI__?: unknown;
		__TAURI_INTERNALS__?: unknown;
		Capacitor?: {
			isNativePlatform?: () => boolean;
		};
	}
}
