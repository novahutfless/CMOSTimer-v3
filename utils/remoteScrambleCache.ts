import { storage } from './platformStorage';
import type { GeneratedScramble } from './scramblerRegistry';

export type RemoteScramble = {
	moves: string[];
	seed: number | null;
	generator: string;
	generatedAt: number;
};

const STORAGE_KEY = 'cmostimer_scramble_cache_v1';
const MAX_PER_SCRAMBLER = 10;
type Cache = Record<string, RemoteScramble[]>;

const load = (): Cache => {
	try {
		const value = JSON.parse(storage.getItem(STORAGE_KEY) || '{}') as Cache;
		return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
	} catch {
		return {};
	}
};

const save = (cache: Cache): void => {
	storage.setItem(STORAGE_KEY, JSON.stringify(cache));
};

export const takeCachedScramble = (scramblerIds: string | string[]): GeneratedScramble | null => {
	const ids = Array.isArray(scramblerIds) ? scramblerIds : [scramblerIds];
	const cache = load();
	if (!ids.every(id => cache[id]?.length)) return null;
	const items = ids.map(id => cache[id].shift()!);
	save(cache);
	return {
		scramble: items.map(item => item.moves),
		...(items.length === 1 && items[0].seed !== null ? { seed: items[0].seed >>> 0 } : {}),
		generatedAt: Math.min(...items.map(item => item.generatedAt)),
		generator: items.map(item => item.generator).join('+')
	};
};

export const storeCachedScrambles = (incoming: Record<string, RemoteScramble[]>): void => {
	const cache = load();
	for (const [id, items] of Object.entries(incoming)) {
		if (!Array.isArray(items)) continue;
		const existingMoves = new Set((cache[id] || []).map(item => item.moves.join(' ')));
		const valid = items.filter(item => item && Array.isArray(item.moves) && item.moves.every(move => typeof move === 'string') && typeof item.generator === 'string' && Number.isFinite(item.generatedAt));
		const additions = valid.filter(item => !existingMoves.has(item.moves.join(' ')));
		cache[id] = [...(cache[id] || []), ...additions].slice(0, MAX_PER_SCRAMBLER);
	}
	save(cache);
};
