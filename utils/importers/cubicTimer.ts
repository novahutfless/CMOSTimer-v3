import { Solve, Penalty } from '../../types';
import { generateId } from '../common';
import { ParsedImport, ImportSession } from './types';
import { parseTime } from './parseTime';

export const parseCubicTimer = (text: string, fileName: string): ParsedImport => {
	let sessionName = 'Imported Session';
	let scramblerId = '333';

	if (fileName) {
		const name = fileName.replace(/\.txt$/i, '');
		const parts = name.split('_');
		if (parts[0] === 'Solves') {
			const datePartIndex = parts.findIndex(p => p.match(/^20\d\d/));
			if (datePartIndex > 1) {
				const eventNameParts = parts.slice(1, datePartIndex);
				sessionName = eventNameParts.join(' ');
				const lowerName = sessionName.toLowerCase();
				if (lowerName.includes('2x2')) scramblerId = '222';
				else if (lowerName.includes('4x4')) scramblerId = '444';
				else if (lowerName.includes('5x5')) scramblerId = '555';
			}
		} else {
			sessionName = name;
		}
	}

	const regex = /"([^"]*)";"([\s\S]*?)";"([\s\S]*?)";"([^"]*)"/g;
	const solves: Solve[] = [];
	let match: RegExpExecArray | null;

	while ((match = regex.exec(text)) !== null) {
		const timeStr = match[1];
		const scrambleStr = match[2];
		const dateStr = match[3];
		const penaltyStr = match[4];

		let penalty = Penalty.NONE;
		if (penaltyStr === 'DNF') penalty = Penalty.DNF;
		else if (penaltyStr.includes('+2')) penalty = Penalty.PLUS_TWO;

		const time = parseTime(timeStr);
		const timestamp = new Date(dateStr).getTime();
		const scramble = scrambleStr.replace(/[\r\n]+/g, ' ').trim().split(/\s+/);

		solves.push({
			id: generateId(),
			timestamp,
			time,
			inspectionTime: -1,
			scramble: [scramble],
			scramblerId: [scramblerId],
			penalty,
			tags: ['Cubic Timer']
		});
	}

	const sessions: ImportSession[] = [{
		id: generateId(),
		name: sessionName,
		scramblerId: [scramblerId],
		solveIds: [],
		solves,
		tags: []
	}];

	return {
		type: 'CubicTimer',
		sessions
	};
};
