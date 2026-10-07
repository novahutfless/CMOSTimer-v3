import { Solve, SolveMap } from '../types';
import { platformStorage, storage } from './platformStorage';

const SOLVES_KEY = 'cmostimer_solves';
const SOLVES_CHUNK_META_KEY = 'cmostimer_solves_chunks';
const SOLVES_CHUNK_KEY_PREFIX = 'cmostimer_solves_chunk_';
const SOLVES_CHUNK_SIZE = 450_000;

const IDB_DB_NAME = 'cmostimer-db';
const IDB_STORE = 'state';
const IDB_SOLVES_KEY = 'solves_v1';
const IDB_DELTA_PREFIX = 'solve_delta:';
const DELTA_HEAD_KEY = 'cmostimer_solve_delta_head';
const DELTA_KEY_PREFIX = 'cmostimer_solve_delta_';

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

const idbSet = async (key: string, value: string): Promise<void> => {
	const db = await openDb();
	await new Promise<void>((resolve, reject) => {
		const tx = db.transaction(IDB_STORE, 'readwrite');
		const store = tx.objectStore(IDB_STORE);
		store.put(value, key);
		if (key === IDB_SOLVES_KEY) clearIdbDeltas(store);
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
		if (key === IDB_SOLVES_KEY) clearIdbDeltas(store);
		tx.oncomplete = (): void => {
			db.close();
			resolve();
		};
		tx.onerror = (): void => reject(tx.error || new Error('IndexedDB delete failed'));
	});
};

const deltaRange = (): IDBKeyRange => IDBKeyRange.bound(IDB_DELTA_PREFIX, IDB_DELTA_PREFIX + '\uffff');
const clearIdbDeltas = (store: IDBObjectStore): void => {
    const cursor = store.openCursor(deltaRange());
    cursor.onsuccess = (): void => {
        const row = cursor.result;
        if (row) { row.delete(); row.continue(); }
    };
};

// Baseline and per-solve overrides are read in one transaction. JSON encoding
// the full map is needed only when loading/exporting, never for an append.
const idbReadSolves = async (): Promise<string | null> => {
    const db = await openDb();
    try {
        return await new Promise((resolve, reject) => {
            const tx = db.transaction(IDB_STORE, 'readonly');
            const store = tx.objectStore(IDB_STORE);
            let baseline: string | null = null;
            const deltas: string[] = [];
            const request = store.get(IDB_SOLVES_KEY);
            request.onsuccess = (): void => { baseline = request.result ?? null; };
            const cursor = store.openCursor(deltaRange());
            cursor.onsuccess = (): void => {
                const row = cursor.result;
                if (row) { deltas.push(row.value as string); row.continue(); }
            };
            tx.oncomplete = (): void => {
                try {
                    if (!deltas.length) { resolve(baseline); return; }
                    const solves: SolveMap = JSON.parse(baseline || '{}');
                    for (const raw of deltas) { const solve = JSON.parse(raw) as Solve; solves[solve.id] = solve; }
                    resolve(JSON.stringify(solves));
                } catch (error) { reject(error); }
            };
            tx.onerror = (): void => reject(tx.error || new Error('IndexedDB read failed'));
            tx.onabort = tx.onerror;
        });
    } finally { db.close(); }
};

const idbAppendSolves = async (encoded: { id: string; value: string }[]): Promise<void> => {
    const db = await openDb();
    try {
        await new Promise<void>((resolve, reject) => {
            const tx = db.transaction(IDB_STORE, 'readwrite');
            const store = tx.objectStore(IDB_STORE);
            for (const solve of encoded) store.put(solve.value, IDB_DELTA_PREFIX + solve.id);
            tx.oncomplete = (): void => resolve();
            tx.onerror = (): void => reject(tx.error || new Error('IndexedDB append failed'));
            tx.onabort = tx.onerror;
        });
    } finally { db.close(); }
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

const writeChunkedOrSingle = async (serialized: string, strict: boolean): Promise<boolean> => {
	const kv = getKvBackend();
	try {
		await kv.set(SOLVES_KEY, serialized);
		await clearChunked();
		return true;
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
		return true;
	} catch {
		await clearChunked();
		if (strict) throw new Error('Failed to persist solves: storage quota exceeded or write blocked.');
		return false;
	}
};

// Native/fallback storage uses a linked journal, so each append writes only
// its own record and a constant-size head pointer, not a growing manifest.
const readJournal = async (): Promise<{ keys: string[]; solves: Solve[] }> => {
    const kv = getKvBackend();
    let head = await kv.get(DELTA_HEAD_KEY);
    const keys: string[] = [];
    const batches: Solve[][] = [];
    const visited = new Set<string>();
    while (head) {
        if (visited.has(head)) throw new Error('Invalid solve journal');
        visited.add(head);
        const raw = await kv.get(head);
        if (!raw) throw new Error('Missing solve journal record');
        const record = JSON.parse(raw) as { previous: string | null; solves: Solve[] };
        keys.push(head); batches.push(record.solves); head = record.previous;
    }
    return { keys, solves: batches.reverse().flat() };
};
const clearJournal = async (): Promise<void> => {
    const kv = getKvBackend();
    const journal = await readJournal();
    await kv.remove(DELTA_HEAD_KEY);
    for (const key of journal.keys) await kv.remove(key);
};
const applyJournal = async (baseline: string | null): Promise<string | null> => {
    const journal = await readJournal();
    if (!journal.solves.length) return baseline;
    const solves: SolveMap = JSON.parse(baseline || '{}');
    for (const solve of journal.solves) solves[solve.id] = solve;
    return JSON.stringify(solves);
};

export const appendPersistedSolves = (solves: Solve[]): Promise<void> => {
    // Capture just changed records before yielding, preserving write order.
    const encoded = solves.map(solve => ({ id: solve.id, value: JSON.stringify(solve) }));
    return enqueuePersistenceWrite(async () => {
        if (!encoded.length) return;
        if (canUseIndexedDb()) {
            // A failed append is reported by the caller; never silently replace
            // the account with a partial snapshot in another backend.
            await idbAppendSolves(encoded);
            return;
        }
        const kv = getKvBackend();
        const previous = await kv.get(DELTA_HEAD_KEY);
        const id = globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2);
        const key = DELTA_KEY_PREFIX + id;
        await kv.set(key, JSON.stringify({ previous, solves: encoded.map(solve => JSON.parse(solve.value)) }));
        await kv.set(DELTA_HEAD_KEY, key);
    });
};

const migrateLegacyToIndexedDb = async (): Promise<void> => {
	const legacy = await readChunkedOrSingle();
	if (!legacy) return;
	await idbSet(IDB_SOLVES_KEY, legacy);
	await clearChunked();
};

export const readPersistedSolves = async (): Promise<string | null> => {
	await persistenceWriteChain;
	if (canUseIndexedDb()) {
		try {
			const fromDb = await idbReadSolves();
			if (fromDb) return await applyJournal(fromDb);
			await migrateLegacyToIndexedDb();
			return await applyJournal(await idbReadSolves());
		} catch {
			// Graceful fallback if IndexedDB fails unexpectedly.
			return await applyJournal(await readChunkedOrSingle());
		}
	}
	return await applyJournal(await readChunkedOrSingle());
};

const writePersistedSolvesNow = async (serialized: string, strict = false): Promise<void> => {
	if (canUseIndexedDb()) {
		try {
			await idbSet(IDB_SOLVES_KEY, serialized);
			await clearJournal();
			// Clean up any legacy key/chunk remnants after successful IndexedDB write.
			await clearChunked();
			return;
		} catch (idbErr) {
			try {
				if (await writeChunkedOrSingle(serialized, strict)) await clearJournal();
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
	if (await writeChunkedOrSingle(serialized, strict)) await clearJournal();
};

export const writePersistedSolves = async (serialized: string, strict = false): Promise<void> =>
	enqueuePersistenceWrite(() => writePersistedSolvesNow(serialized, strict));

export const clearPersistedSolves = async (): Promise<void> => {
	return enqueuePersistenceWrite(async () => {
		if (canUseIndexedDb()) {
			try {
				await idbDelete(IDB_SOLVES_KEY);
			} catch {
				// Fallback below.
			}
		}
		await clearJournal();
		await clearChunked();
		const kv = getKvBackend();
		await kv.remove(SOLVES_KEY);
	});
};

