import { Solve, Penalty, SolveInputSource } from '../../types';
import { generateId } from '../common';
import { ParsedImport, ImportSession } from './types';

type V2Solve = {
	end?: number;
	start?: number;
	zeit?: number;
	inspect?: number;
	scramble?: string;
	penalty?: number;
};

type V2ScramblerDef = [string, { type?: string | number; n?: number; [key: string]: unknown }];

type V2Session = {
	name?: string;
	scrambler?: V2ScramblerDef[];
	solves?: unknown;
};

type V2Data = {
	sessions?: V2Session[];
	cachedSolves?: Record<string, V2Solve>;
};

const mapV2Penalty = (val: number): Penalty => {
	if (val === -1) return Penalty.DNF;
	if (val === 0) return Penalty.NONE;
	if (val === 2000) return Penalty.PLUS_TWO;
	if (val === 4000) return Penalty.PLUS_FOUR;
	if (val === 6000) return Penalty.PLUS_SIX;
	if (val === 8000) return Penalty.PLUS_EIGHT;
	if (val === 10000) return Penalty.PLUS_TEN;
	if (val === 12000) return Penalty.PLUS_TWELVE;
	if (val === 14000) return Penalty.PLUS_FOURTEEN;
	if (val === 16000) return Penalty.PLUS_SIXTEEN;
	//CMOS v2 uses only the above values, so nothing else is valid
	return Penalty.NONE;
};

// v2 stores a generator family plus its options, not just a WCA puzzle id.
const mapV2Scrambler = (def: V2ScramblerDef): string => {
    const [family, options] = def;
    const type = String(options.type ?? '');
    if (family === 'NNN_moves') {
        const n = Number(options.n);
        if (Number.isInteger(n) && n >= 2 && n <= 11) return String(n).repeat(3);
    }
    if (family === 'subset') {
        const subsets: Record<string, string> = { Edge: 'edges', Corner: 'corners', Random: '333', PLL: 'pll', OLL: 'oll' };
        if (subsets[type]) return subsets[type];
    }
    if (family === 'wca' || family === type) {
        const aliases: Record<string, string> = { '444fast': '444', 'sq1fast': 'sq1' };
        if (aliases[type]) return aliases[type];
        if (['333', '222', '444', '555', '666', '777', 'clock', 'pyram', 'minx', 'skewb', 'sq1', '333fm', 'fto'].includes(type)) return type;
    }
    // Keep unsupported generators and all their options explicit. Never change
    // a Kilominx or an unknown generator into an unrelated 3x3 scramble.
    return `cmostimer-v2:${encodeURIComponent(JSON.stringify(def))}`;
};

const parseV2Scramble = (scramble: string, partCount: number): string[][] => {
    const parts = partCount > 1 ? scramble.split(/\s*(?:<br\s*\/?\s*>|\r?\n|\|)\s*/i) : [scramble];
    return parts.map(part => part.trim() ? part.trim().split(/\s+/) : []);
};

const mapV2InputSource = (solve: V2Solve): SolveInputSource => {
	// v2 replaced the browser elapsed time with Stackmat's centisecond value.
	// Allow the adjacent Date reads used by manual entry to differ by a couple ms.
	if (Number.isFinite(solve.start) && Number.isFinite(solve.end) && Number.isFinite(solve.zeit)
		&& Math.abs((solve.end as number) - (solve.start as number) - (solve.zeit as number)) > 2) {
		return SolveInputSource.STACKMAT;
	}
	// v2 reserved -1 for manually entered solves. Timed solves stored either an
	// inspection duration or -42 when inspection was disabled.
	return solve.inspect === -1 ? SolveInputSource.MANUAL : SolveInputSource.KEYBOARD;
};

export const parseCMOSTimerV2 = (data: V2Data): ParsedImport => {
	if (!data.sessions) throw new Error("CMOSTimer v2: Missing 'sessions' key.");
	if (!Array.isArray(data.sessions)) throw new Error("CMOSTimer v2: 'sessions' is not an array.");

	const sessions: ImportSession[] = [];
	const cachedSolves = data.cachedSolves || {};
	const convertedSolves = new Map<string, Solve>();

	data.sessions.forEach((s, idx) => {
		if (!s) return;

		const scramblerIds: string[] = [];
		if (Array.isArray(s.scrambler)) {
			s.scrambler.forEach(def => {
				if (Array.isArray(def) && typeof def[0] === 'string' && def[1] && typeof def[1] === 'object')
					scramblerIds.push(mapV2Scrambler(def));
			});
		}
		if (scramblerIds.length === 0) scramblerIds.push('333');

		const sourceScrambler = { source: 'cmostimer-v2', id: JSON.stringify(s.scrambler || []) };
		const solves: Solve[] = [];
		const solveIds = s.solves;

		if (!Array.isArray(solveIds)) {
			console.warn(`CMOSTimer v2 Import: Session ${idx} 'solves' is not an array. Skipping solves.`);
		} else {
			solveIds.forEach(oldId => {
				const raw = cachedSolves[String(oldId)];
				if (!raw) return;

				const cacheKey = JSON.stringify([String(oldId), scramblerIds]);
				const converted = convertedSolves.get(cacheKey);
				if (converted) {
					solves.push(converted);
					return;
				}
				const solve: Solve = {
					id: generateId(),
					timestamp: raw.end || raw.start || Date.now(),
					time: raw.zeit ?? 0,
					inspectionTime: raw.inspect ?? -1,
					inputSource: mapV2InputSource(raw),
					scramble: parseV2Scramble(raw.scramble || '', scramblerIds.length),
					scramblerId: scramblerIds,
					penalty: mapV2Penalty(raw.penalty ?? 0),
					tags: ['CMOSTimer v2']
				};
				convertedSolves.set(cacheKey, solve);
				solves.push(solve);
			});
		}

		sessions.push({
			id: generateId(),
			name: s.name || 'Unnamed Session',
			scramblerId: scramblerIds,
			sourceScrambler,
			solves,
			solveIds: [],
			tags: []
		});
	});

	return {
		type: 'CMOSTimer v2',
		sessions
	};
};
