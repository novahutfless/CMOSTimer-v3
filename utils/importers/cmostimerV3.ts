import { Solve, Settings, StatConfig } from '../../types';
import { ParsedImport, ImportSession } from './types';

type V3SolveRaw = Omit<Solve, 'scramble' | 'scramblerId'> & {
	scramble: string[][] | string[];
	scramblerId?: string[] | string;
	stats?: unknown;
};

type V3Session = {
	id: string;
	name: string;
	scramblerId?: string[] | string;
	solveIds?: string[];
	solves?: V3SolveRaw[];
	[key: string]: unknown;
};

type V3Data = {
	version?: string;
	sessions?: V3Session[];
	solves?: Record<string, V3SolveRaw>;
	settings?: Settings;
	statsConfig?: StatConfig[];
};

const normalizeScramblerId = (value: string[] | string | undefined): string[] =>
	Array.isArray(value) ? value : [value || '333'];

const normalizeScramble = (scramble: V3SolveRaw['scramble']): string[][] =>
	Array.isArray(scramble) && Array.isArray(scramble[0]) ? (scramble as string[][]) : [scramble as string[]];

export const parseCMOSTimerV3 = (data: V3Data): ParsedImport => {
	if (!data.sessions) throw new Error("CMOSTimer v3: Missing 'sessions' key.");

	const map = data.solves || {};
	const sessions: ImportSession[] = data.sessions.map((s: V3Session) => {
		const solveIds = Array.isArray(s.solveIds) ? s.solveIds : [];
		const solves = solveIds
			.map(id => {
				const slv = map[id];
				if (!slv) return null;
				const { stats: _stats, ...cleanSolve } = slv;
				void _stats;
				return {
					...cleanSolve,
					scramble: normalizeScramble(slv.scramble),
					scramblerId: normalizeScramblerId(slv.scramblerId)
				};
			})
			.filter((slv): slv is Solve => Boolean(slv));

		return {
			...s,
			scramblerId: normalizeScramblerId(s.scramblerId),
			solveIds,
			solves
		};
	});

	if (!data.solves) {
		const legacySessions: ImportSession[] = data.sessions.map((s: V3Session) => ({
			...s,
			scramblerId: normalizeScramblerId(s.scramblerId),
			solveIds: Array.isArray(s.solveIds) ? s.solveIds : [],
			solves: s.solves ? s.solves.map(slv => {
				const { stats: _stats, ...clean } = slv;
				void _stats;
				return {
					...clean,
					scramble: normalizeScramble(slv.scramble),
					scramblerId: normalizeScramblerId(slv.scramblerId)
				};
			}) : []
		}));
		return {
			type: 'CMOSTimer',
			sessions: legacySessions,
			...(data.settings === undefined ? {} : { settings: data.settings }),
			...(data.statsConfig === undefined ? {} : { statsConfig: data.statsConfig })
		};
	}

	return {
		type: 'CMOSTimer',
		sessions,
		...(data.settings === undefined ? {} : { settings: data.settings }),
		...(data.statsConfig === undefined ? {} : { statsConfig: data.statsConfig })
	};
};
