import { describe, expect, it } from 'vitest';
import { Penalty, Session, SyncActionType } from '../../types';
import { parseCMOSTimerV2 } from '../../utils/importers/cmostimerV2';
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

    it('keeps shared v2 solve memberships without duplicate storage or uploads', () => {
        const parsed = parseCMOSTimerV2({
            sessions: [
                { name: 'History', solves: ['a', 'b'] },
                { name: 'Main', solves: ['a', 'b', 'c'] },
            ],
            cachedSolves: { a: { end: 1, zeit: 1000 }, b: { end: 2, zeit: 2000 }, c: { end: 3, zeit: 3000 } }
        });
        const result = prepareImportData({ sessions: parsed.sessions.map(session => ({ session, targetId: 'NEW' })) }, [], {});
        expect(Object.keys(result.solves)).toHaveLength(3);
        expect(result.sessions.map(session => session.solveIds.length)).toEqual([2, 3]);
        expect(result.sessions[1].solveIds.slice(0, 2)).toEqual(result.sessions[0].solveIds);
        const uploaded = result.pendingSyncActions.filter(action => action.type === SyncActionType.UPSERT_SOLVES).flatMap(action => action.payload);
        expect(uploaded).toHaveLength(3);
    });

    it('updates each existing copy when the same imported solve is merged into different targets', () => {
        const imported = { id: 'imported', timestamp: 1, time: 1000, inspectionTime: -1, scramble: [['R']], scramblerId: ['333'], penalty: Penalty.PLUS_TWO };
        const first = { ...imported, id: 'first', penalty: Penalty.NONE };
        const second = { ...imported, id: 'second', penalty: Penalty.NONE };
        const sessions: Session[] = [
            { id: 's1', name: 'First', scramblerId: ['333'], solveIds: ['first'] },
            { id: 's2', name: 'Second', scramblerId: ['333'], solveIds: ['second'] },
        ];
        const result = prepareImportData({ sessions: sessions.map(session => ({
            targetId: session.id, session: { ...session, solves: [imported] } as Session
        })) }, sessions, { first, second });
        expect(result.solves.first.penalty).toBe(Penalty.PLUS_TWO);
        expect(result.solves.second.penalty).toBe(Penalty.PLUS_TWO);
        expect(result.sessions.map(session => session.solveIds)).toEqual([['first'], ['second']]);
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
