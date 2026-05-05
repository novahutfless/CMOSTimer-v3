import { Solve, Penalty } from '../../types';
import { generateId } from '../common';
import { ParsedImport, ImportSession } from './types';
import { parseTime } from './parseTime';

const mapNanoTimerScrambler = (type: string): string => {
	const t = type.toLowerCase();
	if (t.includes('3x3')) return '333';
	if (t.includes('2x2')) return '222';
	if (t.includes('4x4')) return '444';
	if (t.includes('5x5')) return '555';
	if (t.includes('6x6')) return '666';
	if (t.includes('7x7')) return '777';
	if (t.includes('pyram')) return 'pyram';
	if (t.includes('mega')) return 'minx';
	if (t.includes('skewb')) return 'skewb';
	if (t.includes('square')) return 'sq1';
	if (t.includes('clock')) return 'clock';
	return '333';
};

const parseCsvLine = (line: string): string[] => {
	const parts: string[] = [];
	let current = '';
	let inQuote = false;
	for (let j = 0; j < line.length; j++) {
		const char = line[j];
		if (char === '"') {
			inQuote = !inQuote;
		} else if (char === ',' && !inQuote) {
			parts.push(current);
			current = '';
		} else {
			current += char;
		}
	}
	parts.push(current);
	return parts.map(s => s.trim().replace(/^"(.*)"$/, '$1'));
};

export const parseNanoTimer = (text: string): ParsedImport => {
	const lines = text.trim().split('\n');
	const sessionsMap: Record<string, Solve[]> = {};
	const sessionScramblers: Record<string, string> = {};

	const startIndex = lines[0].startsWith('cubetype,') ? 1 : 0;

	for (let i = startIndex; i < lines.length; i++) {
		const line = lines[i].trim();
		if (!line) continue;

		const cols = parseCsvLine(line);
		if (cols.length < 3) continue;

		const cubeType = cols[0];
		const sessionName = cols[1] || 'Default';
		const timeStr = cols[2];
		const dateStr = cols[3];
		const plusTwo = cols[5] === 'y';
		const scrambleStr = cols[8];
		const comment = cols[9];

		if (!sessionScramblers[sessionName])
			sessionScramblers[sessionName] = mapNanoTimerScrambler(cubeType);

		let time = 0;
		let penalty = Penalty.NONE;

		if (timeStr === 'DNF')
			penalty = Penalty.DNF;
		else
			time = parseTime(timeStr);

		if (plusTwo && penalty !== Penalty.DNF)
			penalty = Penalty.PLUS_TWO;

		let timestamp = Date.now();
		try {
			const cleanDate = dateStr.replace(' - ', ' ');
			timestamp = new Date(cleanDate).getTime();
			if (isNaN(timestamp)) timestamp = Date.now();
		} catch {
			// Ignore malformed timestamps and keep the fallback import timestamp.
		}

		const solve: Solve = {
			id: generateId(),
			timestamp,
			time,
			inspectionTime: -1,
			scramble: [scrambleStr ? scrambleStr.trim().split(/\s+/) : []],
			scramblerId: [sessionScramblers[sessionName]],
			penalty,
			comment: comment || "",
			tags: ['NanoTimer']
		};

		if (!sessionsMap[sessionName]) sessionsMap[sessionName] = [];
		sessionsMap[sessionName].push(solve);
	}

	const sessions: ImportSession[] = Object.entries(sessionsMap).map(([name, solves]) => ({
		id: generateId(),
		name,
		scramblerId: [sessionScramblers[name]],
		solves,
		solveIds: [],
		tags: []
	}));

	return {
		type: 'NanoTimer',
		sessions
	};
};
