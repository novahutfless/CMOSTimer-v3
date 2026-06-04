import { Solve } from '../types';
import { generateId } from './common';

export const generateTestSessions = (): {id:string, name:string, scramblerId:string, solves: Solve[]}[] => {
	return [
		{ id: generateId(), name: '3x3', scramblerId: '333', solves: [] },
		{ id: generateId(), name: '2x2', scramblerId: '222', solves: [] },
		{ id: generateId(), name: '4x4', scramblerId: '444', solves: [] },
		{ id: generateId(), name: '5x5', scramblerId: '555', solves: [] },
		{ id: generateId(), name: '6x6', scramblerId: '666', solves: [] },
		{ id: generateId(), name: '7x7', scramblerId: '777', solves: [] },
		{ id: generateId(), name: '3x3 OH', scramblerId: '333', solves: [] },
		{ id: generateId(), name: 'Clock', scramblerId: 'clock', solves: [] },
		{ id: generateId(), name: 'Megaminx', scramblerId: 'minx', solves: [] },
		{ id: generateId(), name: 'Pyraminx', scramblerId: 'pyram', solves: [] },
		{ id: generateId(), name: 'Skewb', scramblerId: 'skewb', solves: [] },
		{ id: generateId(), name: 'Square-1', scramblerId: 'sq1', solves: [] },
	];
};
