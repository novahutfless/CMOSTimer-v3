import { Solve, Penalty } from '../../types';
import { generateId } from '../common';
import { ParsedImport, ImportSession } from './types';

type CsTimerSolveRaw = [[number, number], string, string | undefined, number];
type CsTimerSessionRaw = CsTimerSolveRaw[];

type CsTimerProperties = {
	sessionData?: string;
};

type CsTimerExport = {
	properties?: CsTimerProperties;
	[key: string]: unknown;
};

const mapCsTimerScrambler = (scrType: string): string => {
	if (!scrType) return '333';
	if (scrType === '333') return '333';
	if (scrType === '222so') return '222';
	if (scrType === '444wca') return '444';
	if (scrType === '555wca') return '555';
	return '333';
};

const parseCsTimerSolves = (rawSolves: CsTimerSessionRaw): Solve[] => {
	return rawSolves.map(s => {
		const [pen, timeVal] = s[0];
		let penalty = Penalty.NONE;
		if (pen === 2000) penalty = Penalty.PLUS_TWO;
		if (pen === -1) penalty = Penalty.DNF;

		const scrambleStr = s[1] || "";
		const comment = s[2] || "";
		const timestamp = s.length > 3 ? s[3] * 1000 : 0;

		return {
			id: generateId(),
			timestamp,
			time: timeVal,
			inspectionTime: -1,
			scramble: [scrambleStr.split(' ')],
			scramblerId: ['333'],
			penalty,
			comment: comment,
			tags: ['csTimer']
		};
	});
};

export const parseCsTimer = (data: CsTimerExport): ParsedImport => {
	const sessions: ImportSession[] = [];
	let sessionData: Record<string, { name?: string; opt?: { scrType?: string } }> = {};

	try {
		if (data.properties?.sessionData)
			sessionData = JSON.parse(data.properties.sessionData);
	} catch {
		// Ignore malformed session metadata and fall back to per-session defaults.
	}

	Object.keys(data).forEach(key => {
		if (!key.startsWith('session')) return;
		const sessionIdx = key.replace('session', '');
		const rawSolves = data[key] as CsTimerSessionRaw;
		const meta = sessionData[sessionIdx];
		if (!Array.isArray(rawSolves)) return;
		if (rawSolves.length === 0 && !meta) return;

		const name = meta?.name ? meta.name.toString() : `Session ${sessionIdx}`;
		const scrType = meta?.opt?.scrType ?? '333';
		const scramblerId = mapCsTimerScrambler(scrType);
		const solves = parseCsTimerSolves(rawSolves);

		sessions.push({
			id: generateId(),
			name,
			scramblerId: [scramblerId],
			solves,
			solveIds: [],
			tags: []
		});
	});

	return { type: 'csTimer', sessions };
};
