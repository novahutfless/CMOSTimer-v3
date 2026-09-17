import { describe, expect, it } from 'vitest';
import { Penalty, type Session, type SolveMap } from '../../types';
import {
	compareSolveIdsByChronologicalOrder,
	insertSolveIdChronologically,
	normalizeSessionSolveOrder,
	sortSolveIdsChronologically
} from '../../store/solveOrder';

const solveMap: SolveMap = {
	late: { id: 'late', timestamp: 30, time: 1000, inspectionTime: -1, scramble: [], scramblerId: ['333'], penalty: Penalty.NONE },
	early: { id: 'early', timestamp: 10, time: 3000, inspectionTime: -1, scramble: [], scramblerId: ['333'], penalty: Penalty.NONE },
	tieFast: { id: 'tieFast', timestamp: 20, time: 1000, inspectionTime: -1, scramble: [], scramblerId: ['333'], penalty: Penalty.NONE },
	tieSlow: { id: 'tieSlow', timestamp: 20, time: 2000, inspectionTime: -1, scramble: [], scramblerId: ['333'], penalty: Penalty.NONE }
};

describe('solve ordering', () => {
	it('sorts by timestamp, then time, then stable ID', () => {
		expect(sortSolveIdsChronologically(['late', 'early', 'tieSlow', 'tieFast', 'late'], solveMap)).toEqual([
			'early', 'tieFast', 'tieSlow', 'late'
		]);
		expect(compareSolveIdsByChronologicalOrder('missing', 'early', solveMap)).toBeLessThan(0);
	});

	it('inserts a solve into an already sorted list', () => {
		expect(insertSolveIdChronologically(['early', 'late'], 'tieFast', solveMap)).toEqual(['early', 'tieFast', 'late']);
		expect(insertSolveIdChronologically([], 'early', solveMap)).toEqual(['early']);
	});

	it('normalizes every session without changing unrelated fields', () => {
		const sessions: Session[] = [{ id: 's1', name: 'Main', scramblerId: ['333'], solveIds: ['late', 'early', 'late'], tags: ['keep'] }];
		expect(normalizeSessionSolveOrder(sessions, solveMap)).toEqual([{
			...sessions[0],
			solveIds: ['early', 'late']
		}]);
		expect(sessions[0].solveIds).toEqual(['late', 'early', 'late']);
	});
});
