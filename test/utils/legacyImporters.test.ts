import { describe, expect, it, vi } from 'vitest';
import { Penalty, SolveInputSource } from '../../types';
import { parseCMOSTimerV2 } from '../../utils/importers/cmostimerV2';
import { parseCMOSTimerV3 } from '../../utils/importers/cmostimerV3';

describe('legacy importers', () => {
	it('normalizes CMOSTimer v2 sessions, penalties, and scramblers', () => {
		const result = parseCMOSTimerV2({
			sessions: [{ name: 'Old', scrambler: [['333', { type: '333' }]], solves: ['a', 'missing'] }],
			cachedSolves: {
				a: { end: 1234, zeit: 4567, inspect: 800, scramble: 'R U', penalty: 2000 }
			}
		});

		expect(result.type).toBe('CMOSTimer v2');
		expect(result.sessions[0].scramblerId).toEqual(['333']);
		expect(result.sessions[0].solves).toHaveLength(1);
		expect(result.sessions[0].solves?.[0]).toMatchObject({
			timestamp: 1234,
			time: 4567,
			inspectionTime: 800,
			scramble: [['R', 'U']],
			penalty: Penalty.PLUS_TWO,
			tags: ['CMOSTimer v2']
		});
	});

	it('maps v2 generator families, aliases and relay parts', () => {
        const result = parseCMOSTimerV2({
            sessions: [
                { scrambler: [['wca', { type: '444fast' }]], solves: ['a'] },
                { scrambler: [['wca', { type: 'sq1fast' }]], solves: [] },
                { scrambler: [['NNN_moves', { n: 6 }]], solves: [] },
                { scrambler: [['subset', { type: 'Edge' }]], solves: [] },
                { scrambler: [['subset', { type: 'Corner' }]], solves: [] },
                { scrambler: [['subset', { type: 'Random' }]], solves: [] },
                { scrambler: [['wca', { type: '333fm' }]], solves: [] },
                { scrambler: [['wca', { type: 222 }], ['NNN_moves', { n: 5 }]], solves: ['relay'] },
            ],
            cachedSolves: { a: { scramble: 'Rw U', zeit: 1000 }, relay: { scramble: "R U<br/>Rw U2", zeit: 2000 } }
        });
        expect(result.sessions.map(session => session.scramblerId)).toEqual([
            ['444'], ['sq1'], ['666'], ['edges'], ['corners'], ['333'], ['333fm'], ['222', '555']
        ]);
        expect(result.sessions[0].solves?.[0].scramblerId).toEqual(['444']);
        expect(result.sessions[7].solves?.[0].scramble).toEqual([['R', 'U'], ['Rw', 'U2']]);
    });

    it('preserves unsupported generator options instead of substituting 3x3', () => {
        const definition: [string, { n: number; moves: number }] = ['minx', { n: 2, moves: 8 }];
        const result = parseCMOSTimerV2({ sessions: [{ scrambler: [definition], solves: [] }] });
        expect(result.sessions[0].scramblerId[0]).toBe(`cmostimer-v2:${encodeURIComponent(JSON.stringify(definition))}`);
        expect(JSON.parse(result.sessions[0].sourceScrambler!.id)).toEqual([definition]);
    });

    it('converts shared cached solves only once per scrambler configuration', () => {
        const result = parseCMOSTimerV2({
            sessions: [
                { scrambler: [['wca', { type: 333 }]], solves: ['a'] },
                { scrambler: [['wca', { type: 333 }]], solves: ['a'] },
                { scrambler: [['wca', { type: '444fast' }]], solves: ['a'] },
            ],
            cachedSolves: { a: { scramble: 'R U', zeit: 1000 } }
        });
        expect(result.sessions[0].solves?.[0]).toBe(result.sessions[1].solves?.[0]);
        expect(result.sessions[2].solves?.[0].scramblerId).toEqual(['444']);
        expect(result.sessions[2].solves?.[0].id).not.toBe(result.sessions[0].solves?.[0].id);
    });

	it('restores v2 keyboard, manual, and Stackmat input sources', () => {
		const result = parseCMOSTimerV2({
			sessions: [{ solves: ['keyboard', 'manual', 'stackmat'] }],
			cachedSolves: {
				keyboard: { start: 10_000, end: 15_000, zeit: 5_000, inspect: -42 },
				manual: { start: 20_000, end: 25_001, zeit: 5_000, inspect: -1 },
				stackmat: { start: 30_000, end: 35_087, zeit: 5_030, inspect: -1 }
			}
		});

		expect(result.sessions[0].solves?.map(solve => solve.inputSource)).toEqual([
			SolveInputSource.KEYBOARD,
			SolveInputSource.MANUAL,
			SolveInputSource.STACKMAT
		]);
	});

	it('rejects v2 data without sessions and skips malformed solve lists', () => {
		expect(() => parseCMOSTimerV2({})).toThrow("Missing 'sessions' key");
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
		const result = parseCMOSTimerV2({ sessions: [{ name: 'Empty', solves: 'not-an-array' }] });
		expect(result.sessions[0].solves).toEqual([]);
		expect(warn).toHaveBeenCalled();
		warn.mockRestore();
	});

	it('normalizes modern v3 map data and removes legacy stats', () => {
		const result = parseCMOSTimerV3({
			sessions: [{ id: 's1', name: 'Main', scramblerId: '333', solveIds: ['solve-1', 'missing'] }],
			solves: {
				'solve-1': {
					id: 'solve-1', timestamp: 1, time: 1000, inspectionTime: -1,
					scramble: ['R', 'U'], scramblerId: '333', penalty: Penalty.NONE, stats: { avg5: 1000 }
				}
			}
		});

		expect(result.sessions[0].scramblerId).toEqual(['333']);
		expect(result.sessions[0].solveIds).toEqual(['solve-1', 'missing']);
		expect(result.sessions[0].solves?.[0]).toMatchObject({ scramble: [['R', 'U']], scramblerId: ['333'] });
		expect(result.sessions[0].solves?.[0]).not.toHaveProperty('stats');
	});

	it('supports inline legacy v3 solves and preserves optional settings', () => {
		const result = parseCMOSTimerV3({
			settings: { language: 'en' } as never,
			sessions: [{
				id: 's1', name: 'Legacy',
				solves: [{
					id: 'solve-1', timestamp: 1, time: 1000, inspectionTime: -1,
					scramble: [['R']], penalty: Penalty.DNF, stats: { mean3: 1 }
				}]
			}]
		});

		expect(result.type).toBe('CMOSTimer');
		expect(result.settings).toEqual({ language: 'en' });
		expect(result.sessions[0].scramblerId).toEqual(['333']);
		expect(result.sessions[0].solves?.[0]).toMatchObject({ scramblerId: ['333'], penalty: Penalty.DNF });
		expect(result.sessions[0].solves?.[0]).not.toHaveProperty('stats');
	});
});
