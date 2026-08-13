import { describe, expect, it } from 'vitest';
import { Penalty, Session, SyncActionType } from '../../types';
import { prepareImportData } from '../../store/importProcessing';

describe('importProcessing', () => {
	it('deduplicates imported solves into an existing session by timestamp and time', () => {
		const existingSolve = {
			id: 'solve-1',
			timestamp: 1000,
			time: 1234,
			inspectionTime: -1,
			scramble: [['R', 'U']],
			scramblerId: ['333'],
			penalty: Penalty.NONE,
			tags: []
		};
		const existingSession: Session = {
			id: 'session-1',
			name: 'Main',
			scramblerId: ['333'],
			solveIds: ['solve-1'],
			sourceSessionIds: []
		};

		const result = prepareImportData({
			sessions: [{
				targetId: 'session-1',
				session: {
					...existingSession,
					solveIds: [],
					solves: [{
						...existingSolve,
						id: 'imported-1'
					}]
				} as Session
			}]
		}, [existingSession], { 'solve-1': existingSolve });

		expect(Object.keys(result.solves)).toEqual(['solve-1']);
		expect(result.sessions[0].solveIds).toEqual(['solve-1']);
		expect(result.pendingSyncActions).toEqual([
			{ type: SyncActionType.UPSERT_SOLVES, payload: [existingSolve] }
		]);
	});

	it('strips legacy stats and creates a new normalized session', () => {
		const importedSession = {
			id: 'import-session',
			name: 'Imported',
			scramblerId: ['333'],
			solveIds: [],
			solves: [{
				id: 'legacy-solve',
				timestamp: 2000,
				time: 2345,
				inspectionTime: -1,
				scramble: 'R U F',
				scramblerId: '333',
				penalty: Penalty.NONE,
				stats: { avg5: 1234 }
			}]
		} as Session;

		const result = prepareImportData({
			sessions: [{
				targetId: 'NEW',
				session: importedSession
			}]
		}, [], {});

		expect(result.sessions).toHaveLength(1);
		expect(result.sessions[0].solveIds).toEqual(['legacy-solve']);
		expect(result.solves['legacy-solve']).toMatchObject({
			id: 'legacy-solve',
			scramble: [['R', 'U', 'F']],
			scramblerId: ['333']
		});
		expect('stats' in result.solves['legacy-solve']).toBe(false);
	});
});
