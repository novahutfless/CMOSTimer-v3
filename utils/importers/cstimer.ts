import { CustomScramblerConfig, Solve, Penalty, Session, SolveMap } from '../../types';
import { generateId } from '../common';
import { getSolveTime } from '../math';
import { ParsedImport, ImportSession } from './types';

type CsTimerSolveRaw = [[number, number], string, string | undefined, number];
type CsTimerSessionRaw = CsTimerSolveRaw[];
type CsTimerProperties = { sessionData?: string };
type CsTimerExport = { properties?: CsTimerProperties; [key: string]: unknown };
type CsTimerSessionMetadata = { name?: string; opt?: { scrType?: string } };

const CMOS_PENALTY_MARKER = /(?:\r?\n)?\[CMOSTimer penalty: ([A-Z_]+); raw: (\d+)\]$/;

const isPenalty = (value: string | undefined): value is Penalty =>
	value !== undefined && Object.values(Penalty).includes(value as Penalty);

export type CsTimerScramblerResolution = {
	kind: 'builtin' | 'composite' | 'custom-config' | 'unresolved';
	scramblerId: string[];
	customScramblerConfig?: CustomScramblerConfig;
};

const BUILTIN_SCRAMBLERS: Record<string, string | string[]> = {
	'333': '333', '222so': '222', '222o': '222_optimal', '444wca': '444', '555wca': '555', '666wca': '666', '777wca': '777',
	'333ni': '333', '333fm': '333fm', '333oh': '333', 'clkwca': 'clock', 'mgmp': 'minx', 'pyrso': 'pyram', 'skbso': 'skewb', 'ftoso': 'fto', 'sqrs': 'sq1',
	'444bld': '444', '555bld': '555', 'edges': 'edges', 'corners': 'corners', '333ft': '333',
	'pll': 'pll', 'oll': 'oll', 'll': 'll', 'zbll': 'zbll', 'coll': 'coll', 'cll': 'cll', 'ell': 'ell', '2gll': '2gll', 'zzll': 'zzll', 'zbls': 'zbls', 'eols': 'eols', 'wvls': 'wvls', 'vls': 'vls', 'f2l': 'f2l', 'eoline': 'eoline', 'eocross': 'eocross', 'easyc': 'easyc', 'easyxc': 'easyxc',
	'sbrx': 'sbrx', 'cmll': 'cmll', 'lse': 'lse', 'mt3qb': 'mt3qb', 'mteole': 'mteole', 'mttdr': 'mttdr', 'mt6cp': 'mt6cp', 'mtcdrll': 'mtcdrll', 'mtl5ep': 'mtl5ep', 'ttll': 'ttll',
	'444m': '444', '223': '223', '233': '332', '334': '334', '335': '335', '336': '336', '337': '337', '888': '888', '999': '999', '101010': '101010', '111111': '111111',
	'2gen': '2gen_ru', '2genl': '2gen_lu', '3gen_F': '3gen_ruf',
	'r234': ['222', '333', '444'], 'r2345': ['222', '333', '444', '555'], 'r23456': ['222', '333', '444', '555', '666'], 'r234567': ['222', '333', '444', '555', '666', '777'],
	'r234w': ['222', '333', '444'], 'r2345w': ['222', '333', '444', '555'], 'r23456w': ['222', '333', '444', '555', '666'], 'r234567w': ['222', '333', '444', '555', '666', '777']
};

const CUSTOM_SCRAMBLERS: Record<string, CustomScramblerConfig> = {
	'333o': { moves: "U U' U2 D D' D2 R R' R2 L L' L2 F F' F2 B B' B2", opposites: 'U-D R-L F-B', length: 25 },
	'3gen_L': { moves: "L L' L2 U U' U2 F F' F2", opposites: '', length: 30 },
	'RrU': { moves: "R R' R2 Rw Rw' Rw2 U U' U2", opposites: '', length: 25 },
	'half': { moves: "U2 D2 R2 L2 F2 B2", opposites: 'U-D R-L F-B', length: 25 }
};

const CS_TIMER_IDS_BY_CMOS: Record<string, string> = {
	'333': '333', '222': '222so', '222_optimal': '222o', '444': '444wca', '555': '555wca', '666': '666wca', '777': '777wca',
	'333fm': '333fm', 'clock': 'clkwca', 'minx': 'mgmp', 'pyram': 'pyrso', 'skewb': 'skbso', 'fto': 'ftoso', 'sq1': 'sqrs',
	'edges': 'edges', 'corners': 'corners', 'pll': 'pll', 'oll': 'oll', 'll': 'll', 'zbll': 'zbll', 'coll': 'coll', 'cll': 'cll', 'ell': 'ell', '2gll': '2gll',
	'zzll': 'zzll', 'zbls': 'zbls', 'eols': 'eols', 'wvls': 'wvls', 'vls': 'vls', 'f2l': 'f2l', 'eoline': 'eoline', 'eocross': 'eocross',
	'easyc': 'easyc', 'easyxc': 'easyxc', 'sbrx': 'sbrx', 'cmll': 'cmll', 'lse': 'lse', 'mt3qb': 'mt3qb', 'mteole': 'mteole',
	'mttdr': 'mttdr', 'mt6cp': 'mt6cp', 'mtcdrll': 'mtcdrll', 'mtl5ep': 'mtl5ep', 'ttll': 'ttll', '223': '223', '332': '233',
	'334': '334', '335': '335', '336': '336', '337': '337', '888': '888', '999': '999', '101010': '101010', '111111': '111111',
	'2gen_ru': '2gen', '2gen_lu': '2genl', '3gen_ruf': '3gen_F',
	'222|333|444': 'r234', '222|333|444|555': 'r2345', '222|333|444|555|666': 'r23456', '222|333|444|555|666|777': 'r234567'
};

/** Resolve only generators CMOSTimer can provide today; unknown ids remain explicit. */
export const resolveCsTimerScrambler = (scrType: string | undefined): CsTimerScramblerResolution => {
	const normalized = scrType?.trim() || '333';
	const builtin = BUILTIN_SCRAMBLERS[normalized];
	if (builtin) {
		const scramblerId = Array.isArray(builtin) ? builtin : [builtin];
		return { kind: scramblerId.length > 1 ? 'composite' : 'builtin', scramblerId };
	}
	const customScramblerConfig = CUSTOM_SCRAMBLERS[normalized];
	if (customScramblerConfig) return { kind: 'custom-config', scramblerId: ['custom'], customScramblerConfig };
	return { kind: 'unresolved', scramblerId: [`cstimer:${normalized}`] };
};

const splitScramble = (scramble: string, partCount: number): string[][] => {
	const parts = partCount > 1 ? scramble.split(/\s*(?:\r?\n|\|)\s*/) : [scramble];
	return parts.map(part => part.trim() ? part.trim().split(/\s+/) : []);
};

const parseCsTimerSolves = (rawSolves: CsTimerSessionRaw, resolution: CsTimerScramblerResolution, sourceId: string): Solve[] => rawSolves.map(s => {
	const [pen, timeVal] = s[0];
	const originalComment = s[2] || '';
	const marker = originalComment.match(CMOS_PENALTY_MARKER);
	const markedPenalty = isPenalty(marker?.[1]) ? marker[1] : undefined;
	const markedRawTime = marker?.[2] ? Number(marker[2]) : undefined;
	const comment = marker ? originalComment.slice(0, marker.index) : originalComment;
	return {
		id: generateId(), timestamp: s.length > 3 ? s[3] * 1000 : 0, time: markedRawTime ?? timeVal, inspectionTime: -1,
		scramble: splitScramble(s[1] || '', resolution.scramblerId.length), scramblerId: [...resolution.scramblerId],
		sourceScrambler: { source: 'cstimer', id: sourceId }, penalty: markedPenalty ?? (pen === 2000 ? Penalty.PLUS_TWO : pen === -1 ? Penalty.DNF : Penalty.NONE),
		comment, tags: ['csTimer']
	};
});

export const parseCsTimer = (data: CsTimerExport): ParsedImport => {
	const sessions: ImportSession[] = [];
	let sessionData: Record<string, CsTimerSessionMetadata> = {};
	try {
		if (data.properties?.sessionData) sessionData = JSON.parse(data.properties.sessionData);
	} catch {
		// Metadata is optional.
	}

	Object.keys(data).forEach(key => {
		if (!key.startsWith('session')) return;
		const sessionIdx = key.replace('session', '');
		const rawSolves = data[key] as CsTimerSessionRaw;
		const meta = sessionData[sessionIdx];
		if (!Array.isArray(rawSolves) || (rawSolves.length === 0 && !meta)) return;
		const sourceId = meta?.opt?.scrType?.trim() || '333';
		const resolution = resolveCsTimerScrambler(sourceId);
		sessions.push({
			id: generateId(), name: meta?.name ? meta.name.toString() : `Session ${sessionIdx}`,
			scramblerId: [...resolution.scramblerId], sourceScrambler: { source: 'cstimer', id: sourceId },
			...(resolution.customScramblerConfig === undefined ? {} : { customScramblerConfig: resolution.customScramblerConfig }),
			solves: parseCsTimerSolves(rawSolves, resolution, sourceId), solveIds: [], tags: []
		});
	});
	return { type: 'csTimer', sessions };
};

const csTimerScramblerId = (session: Session): string => {
	if (session.sourceScrambler?.source === 'cstimer') return session.sourceScrambler.id;
	return CS_TIMER_IDS_BY_CMOS[session.scramblerId.join('|')] || `cmostimer:${session.scramblerId.join('+')}`;
};

const encodeCsTimerSolve = (solve: Solve): CsTimerSolveRaw => {
	const requiresMarker = ![Penalty.NONE, Penalty.PLUS_TWO, Penalty.DNF].includes(solve.penalty);
	const comment = requiresMarker
		? `${solve.comment || ''}${solve.comment ? '\n' : ''}[CMOSTimer penalty: ${solve.penalty}; raw: ${solve.time}]`
		: solve.comment;
	const pen = solve.penalty === Penalty.PLUS_TWO ? 2000 : [Penalty.DNF, Penalty.DNS].includes(solve.penalty) ? -1 : 0;
	const time = requiresMarker ? (getSolveTime(solve) ?? solve.time) : solve.time;
	return [[pen, time], solve.scramble.map(part => part.join(' ')).join('\n'), comment, Math.floor(solve.timestamp / 1000)];
};

/**
 * Builds a csTimer JSON export. Standard csTimer penalties are native; CMOS-only
 * penalties are stored in a comment marker so a later CMOS import restores them.
 */
export const buildCsTimerExport = (sessions: Session[], solves: SolveMap): CsTimerExport => {
	const sessionData: Record<string, CsTimerSessionMetadata> = {};
	const exported: CsTimerExport = { properties: { sessionData: '' } };

	sessions.forEach((session, index) => {
		const sessionIndex = String(index + 1);
		sessionData[sessionIndex] = { name: session.name, opt: { scrType: csTimerScramblerId(session) } };
		exported[`session${sessionIndex}`] = session.solveIds
			.map(solveId => solves[solveId])
			.filter((solve): solve is Solve => !!solve)
			.map(encodeCsTimerSolve);
	});

	exported.properties = { sessionData: JSON.stringify(sessionData) };
	return exported;
};
