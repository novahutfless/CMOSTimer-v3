import { Session, Settings, SolveMap } from '../types';

export const compareSolveIdsByChronologicalOrder = (aId: string, bId: string, solveMap: SolveMap): number => {
	const a = solveMap[aId];
	const b = solveMap[bId];
	const tsA = a?.timestamp ?? 0;
	const tsB = b?.timestamp ?? 0;
	if (tsA !== tsB) return tsA - tsB;
	const tA = a?.time ?? 0;
	const tB = b?.time ?? 0;
	if (tA !== tB) return tA - tB;
	return aId.localeCompare(bId);
};

export const sortSolveIdsChronologically = (ids: string[], solveMap: SolveMap): string[] =>
	Array.from(new Set(ids)).sort((a, b) => compareSolveIdsByChronologicalOrder(a, b, solveMap));

export const insertSolveIdChronologically = (ids: string[], solveId: string, solveMap: SolveMap): string[] => {
	if (ids.length === 0) return [solveId];

	const lastId = ids[ids.length - 1];
	if (compareSolveIdsByChronologicalOrder(lastId, solveId, solveMap) <= 0) {
		return [...ids, solveId];
	}

	let left = 0;
	let right = ids.length;
	while (left < right) {
		const mid = (left + right) >> 1;
		if (compareSolveIdsByChronologicalOrder(ids[mid], solveId, solveMap) <= 0) left = mid + 1;
		else right = mid;
	}
	return [...ids.slice(0, left), solveId, ...ids.slice(left)];
};

export const normalizeSessionSolveOrder = (sessionList: Session[], solveMap: SolveMap): Session[] =>
	sessionList.map(s => ({ ...s, solveIds: sortSolveIdsChronologically(s.solveIds || [], solveMap) }));

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const buildObjectPatch = (previous: Record<string, unknown>, next: Record<string, unknown>): Record<string, unknown> => {
	const patch: Record<string, unknown> = {};
	Object.keys(previous).forEach((key) => {
		if (!(key in next)) patch[key] = { __cmosDelete: true };
	});
	Object.keys(next).forEach((key) => {
		const previousValue = previous[key];
		const nextValue = next[key];
		if (JSON.stringify(previousValue) === JSON.stringify(nextValue)) return;
		if (isPlainObject(previousValue) && isPlainObject(nextValue)) {
			const nestedPatch = buildObjectPatch(previousValue, nextValue);
			if (Object.keys(nestedPatch).length > 0) patch[key] = nestedPatch;
		} else {
			patch[key] = nextValue;
		}
	});
	return patch;
};

export const buildSettingsPatch = (prev: Settings, next: Settings): Partial<Settings> =>
	buildObjectPatch(prev as unknown as Record<string, unknown>, next as unknown as Record<string, unknown>) as Partial<Settings>;
