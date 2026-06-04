import { Solve, Penalty } from '../../types';
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

type V2ScramblerDef = [string, { type?: string | number }];

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
	return Penalty.NONE;
};

const mapV2Scrambler = (type: string | number): string => {
	const t = type.toString();
	if (t === '333') return '333';
	if (t === '222') return '222';
	if (t === '444') return '444';
	if (t === '555') return '555';
	if (t === '666') return '666';
	if (t === '777') return '777';
	if (t === 'clock') return 'clock';
	if (t === 'pyram') return 'pyram';
	if (t === 'minx') return 'minx';
	if (t === 'skewb') return 'skewb';
	if (t === 'sq1') return 'sq1';
	return '333';
};

export const parseCMOSTimerV2 = (data: V2Data): ParsedImport => {
	if (!data.sessions) throw new Error("CMOSTimer v2: Missing 'sessions' key.");
	if (!Array.isArray(data.sessions)) throw new Error("CMOSTimer v2: 'sessions' is not an array.");

	const sessions: ImportSession[] = [];
	const cachedSolves = data.cachedSolves || {};

	data.sessions.forEach((s, idx) => {
		if (!s) return;

		const scramblerIds: string[] = [];
		if (Array.isArray(s.scrambler))
			s.scrambler.forEach(def => {
				if (Array.isArray(def) && def.length > 1 && def[1]?.type)
					scramblerIds.push(mapV2Scrambler(def[1].type));
			});

		if (scramblerIds.length === 0) scramblerIds.push('333');

		const solves: Solve[] = [];
		const solveIds = s.solves;

		if (!Array.isArray(solveIds))
			console.warn(`CMOSTimer v2 Import: Session ${idx} 'solves' is not an array. Skipping solves.`);
		else
			solveIds.forEach(oldId => {
				const raw = cachedSolves[String(oldId)];
				if (!raw) return;

				const solve: Solve = {
					id: generateId(),
					timestamp: raw.end || raw.start || Date.now(),
					time: raw.zeit ?? 0,
					inspectionTime: raw.inspect ?? -1,
					scramble: [(raw.scramble || '').trim().split(/\s+/)],
					scramblerId: scramblerIds,
					penalty: mapV2Penalty(raw.penalty ?? 0),
					tags: ['CMOSTimer v2']
				};
				solves.push(solve);
			});

		sessions.push({
			id: generateId(),
			name: s.name || 'Unnamed Session',
			scramblerId: scramblerIds,
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
