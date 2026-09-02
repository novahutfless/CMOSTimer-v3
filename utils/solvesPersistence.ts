import { platformStorage, storage } from './platformStorage';

const SOLVES_KEY = 'cmostimer_solves';
const SOLVES_CHUNK_META_KEY = 'cmostimer_solves_chunks';
const SOLVES_CHUNK_KEY_PREFIX = 'cmostimer_solves_chunk_';
const SOLVES_CHUNK_SIZE = 450_000;

const IDB_DB_NAME = 'cmostimer-db';
const IDB_STORE = 'state';
const IDB_SOLVES_KEY = 'solves_v1';

// IndexedDB writes are asynchronous. Keep them strictly ordered so a slow
// serialization from an older React render can never overwrite newer solves.
let persistenceWriteChain: Promise<void> = Promise.resolve();

const enqueuePersistenceWrite = (operation: () => Promise<void>): Promise<void> => {
	const pending = persistenceWriteChain.then(operation);
	// Keep the queue usable after a failed write while still returning the error
	// to the caller that initiated it.
	persistenceWriteChain = pending.catch(() => undefined);
	return pending;
};

const canUseIndexedDb = (): boolean => {
	try {
		return typeof window !== 'undefined'
			&& typeof window.indexedDB !== 'undefined'
			&& !platformStorage.isNativeRuntime();
	} catch {
		return false;
	}
};

const openDb = (): Promise<IDBDatabase> =>
	new Promise((resolve, reject) => {
		const req = window.indexedDB.open(IDB_DB_NAME, 1);
		req.onupgradeneeded = (): void => {
			const db = req.result;
			if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
		};
		req.onsuccess = (): void => resolve(req.result);
		req.onerror = (): void => reject(req.error || new Error('IndexedDB open failed'));
	});

const idbGet = async (key: string): Promise<string | null> => {
	const db = await openDb();
	return await new Promise((resolve, reject) => {
		const tx = db.transaction(IDB_STORE, 'readonly');
		const store = tx.objectStore(IDB_STORE);
		const req = store.get(key);
		req.onsuccess = (): void => resolve((req.result as string | undefined) ?? null);
		req.onerror = (): void => reject(req.error || new Error('IndexedDB read failed'));
		tx.oncomplete = (): void => db.close();
	});
};

const idbSet = async (key: string, value: string): Promise<void> => {
	const db = await openDb();
	await new Promise<void>((resolve, reject) => {
		const tx = db.transaction(IDB_STORE, 'readwrite');
		const store = tx.objectStore(IDB_STORE);
		store.put(value, key);
		tx.oncomplete = (): void => {
			db.close();
			resolve();
		};
		tx.onerror = (): void => reject(tx.error || new Error('IndexedDB write failed'));
		tx.onabort = (): void => reject(tx.error || new Error('IndexedDB write aborted'));
	});
};

const idbDelete = async (key: string): Promise<void> => {
	const db = await openDb();
	await new Promise<void>((resolve, reject) => {
		const tx = db.transaction(IDB_STORE, 'readwrite');
		const store = tx.objectStore(IDB_STORE);
		store.delete(key);
		tx.oncomplete = (): void => {
			db.close();
			resolve();
		};
		tx.onerror = (): void => reject(tx.error || new Error('IndexedDB delete failed'));
	});
};

type Kv = {
	get: (key: string) => Promise<string | null>;
	set: (key: string, value: string) => Promise<void>;
	remove: (key: string) => Promise<void>;
};

const getKvBackend = (): Kv => {
	if (platformStorage.isNativeRuntime() && platformStorage.hasNativeBackend()) {
		return {
			get: (key: string): Promise<string | null> => platformStorage.getNativeItem(key),
			set: (key: string, value: string): Promise<void> => platformStorage.setNativeItem(key, value),
			remove: (key: string): Promise<void> => platformStorage.removeNativeItem(key)
		};
	}
	return {
		get: async (key: string): Promise<string | null> => storage.getItem(key),
		set: async (key: string, value: string): Promise<void> => {
			if (!storage.setItem(key, value)) throw new Error('Browser storage write failed or quota exceeded.');
		},
		remove: async (key: string): Promise<void> => {
			if (!storage.removeItem(key)) throw new Error('Browser storage removal failed.');
		}
	};
};

const clearChunked = async (): Promise<void> => {
	const kv = getKvBackend();
	const rawCount = await kv.get(SOLVES_CHUNK_META_KEY);
	const count = rawCount ? parseInt(rawCount, 10) : 0;
	if (Number.isFinite(count) && count > 0) {
		for (let i = 0; i < count; i++) await kv.remove(`${SOLVES_CHUNK_KEY_PREFIX}${i}`);
	}
	await kv.remove(SOLVES_CHUNK_META_KEY);
};

const readChunkedOrSingle = async (): Promise<string | null> => {
	const kv = getKvBackend();
	const direct = await kv.get(SOLVES_KEY);
	if (direct) return direct;

	const rawCount = await kv.get(SOLVES_CHUNK_META_KEY);
	const count = rawCount ? parseInt(rawCount, 10) : 0;
	if (!Number.isFinite(count) || count <= 0) return null;

	let combined = '';
	for (let i = 0; i < count; i++) {
		const chunk = await kv.get(`${SOLVES_CHUNK_KEY_PREFIX}${i}`);
		if (chunk === null) return null;
		combined += chunk;
	}
	return combined || null;
};

const writeChunkedOrSingle = async (serialized: string, strict: boolean): Promise<void> => {
	const kv = getKvBackend();
	try {
		await kv.set(SOLVES_KEY, serialized);
		await clearChunked();
		return;
	} catch {
		// Fall through to chunked writes.
	}

	const chunkCount = Math.ceil(serialized.length / SOLVES_CHUNK_SIZE);
	try {
		for (let i = 0; i < chunkCount; i++) {
			const start = i * SOLVES_CHUNK_SIZE;
			const end = start + SOLVES_CHUNK_SIZE;
			await kv.set(`${SOLVES_CHUNK_KEY_PREFIX}${i}`, serialized.slice(start, end));
		}
		await kv.set(SOLVES_CHUNK_META_KEY, String(chunkCount));
		await kv.remove(SOLVES_KEY);
	} catch {
		await clearChunked();
		if (strict) throw new Error('Failed to persist solves: storage quota exceeded or write blocked.');
	}
};

const migrateLegacyToIndexedDb = async (): Promise<void> => {
	const legacy = await readChunkedOrSingle();
	if (!legacy) return;
	await idbSet(IDB_SOLVES_KEY, legacy);
	await clearChunked();
};

export const readPersistedSolves = async (): Promise<string | null> => {
	if (canUseIndexedDb()) {
		try {
			const fromDb = await idbGet(IDB_SOLVES_KEY);
			if (fromDb) return fromDb;
			await migrateLegacyToIndexedDb();
			return await idbGet(IDB_SOLVES_KEY);
		} catch {
			// Graceful fallback if IndexedDB fails unexpectedly.
			return await readChunkedOrSingle();
		}
	}
	return await readChunkedOrSingle();
};

const writePersistedSolvesNow = async (serialized: string, strict = false): Promise<void> => {
	if (canUseIndexedDb()) {
		try {
			await idbSet(IDB_SOLVES_KEY, serialized);
			// Clean up any legacy key/chunk remnants after successful IndexedDB write.
			await clearChunked();
			return;
		} catch (idbErr) {
			try {
				await writeChunkedOrSingle(serialized, strict);
				return;
			} catch {
				if (strict) {
					const msg = idbErr instanceof Error ? idbErr.message : 'IndexedDB write failed';
					throw new Error(`Failed to persist solves in IndexedDB and fallback storage: ${msg}`);
				}
				return;
			}
		}
	}
	await writeChunkedOrSingle(serialized, strict);
};

export const writePersistedSolves = async (serialized: string, strict = false): Promise<void> =>
	enqueuePersistenceWrite(() => writePersistedSolvesNow(serialized, strict));

export const clearPersistedSolves = async (): Promise<void> => {
	return enqueuePersistenceWrite(async () => {
		if (canUseIndexedDb()) {
			try {
				await idbDelete(IDB_SOLVES_KEY);
				return;
			} catch {
				// Fallback below.
			}
		}
		await clearChunked();
		const kv = getKvBackend();
		await kv.remove(SOLVES_KEY);
	});
};

