type NativeStorageBackend = {
	getItem: (key: string) => Promise<string | null>;
	setItem: (key: string, value: string) => Promise<void>;
	removeItem: (key: string) => Promise<void>;
};

const NATIVE_KEY_SET = new Set<string>([
	'cmostimer_sessions',
	'cmostimer_solves',
	'cmostimer_current_session',
	'cmostimer_goals',
	'cmostimer_plugins_state',
	'cmostimer_plugins',
	'cmostimer_stats_config',
	'cmostimer_settings',
	'cmostimer_sync_queue',
	'cmostimer_token',
	'cmostimer_user',
	'cmostimer_virtual_camera',
	'cmostimer_solves_chunks',
]);

const SOLVES_CHUNK_META_KEY = 'cmostimer_solves_chunks';
const SOLVES_CHUNK_KEY_PREFIX = 'cmostimer_solves_chunk_';

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

const isNativeRuntime = (): boolean => isCapacitorNative() || isTauriRuntime();

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

	// Restore chunked solves payload if present.
	try {
		const rawCount = await nativeBackend.getItem(SOLVES_CHUNK_META_KEY);
		const count = rawCount ? parseInt(rawCount, 10) : 0;
		if (Number.isFinite(count) && count > 0) {
			for (let i = 0; i < count; i++) {
				const key = `${SOLVES_CHUNK_KEY_PREFIX}${i}`;
				const chunk = await nativeBackend.getItem(key);
				if (chunk !== null) window.localStorage.setItem(key, chunk);
			}
		}
	} catch {
		// Ignore chunk sync failures and keep browser storage behavior.
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

export const platformStorage = {
	isNativeRuntime: (): boolean => isNativeRuntime(),
	hasNativeBackend: (): boolean => nativeBackend !== null,
	getNativeItem: async (key: string): Promise<string | null> => {
		if (!nativeBackend) return null;
		return nativeBackend.getItem(key);
	},
	setNativeItem: async (key: string, value: string): Promise<void> => {
		if (!nativeBackend) throw new Error('Native backend unavailable');
		await nativeBackend.setItem(key, value);
	},
	removeNativeItem: async (key: string): Promise<void> => {
		if (!nativeBackend) return;
		await nativeBackend.removeItem(key);
	}
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

