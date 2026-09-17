import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseTime } from '../../utils/importers/parseTime';
import { parseNanoTimer } from '../../utils/importers/nanoTimer';
import { parseCubicTimer } from '../../utils/importers/cubicTimer';
import { Penalty } from '../../types';
import { buildCsTimerExport, parseCsTimer, resolveCsTimerScrambler } from '../../utils/importers/cstimer';
import { Session, SolveMap } from '../../types';

describe('Importers', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2025-01-15T12:00:00'));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('parses time strings to milliseconds', () => {
		expect(parseTime('12.34')).toBe(12340);
		expect(parseTime('1:02.50')).toBe(62500);
	});

	it('parses NanoTimer CSV exports', () => {
		const csv = [
			'cubetype,session,solve,datetime,foo,plus2,bar,baz,scramble,comment',
			'3x3,Session A,12.34,2025-01-02 12:00:00,,y,,,"R U",note'
		].join('\n');
		const result = parseNanoTimer(csv);
		expect(result.type).toBe('NanoTimer');
		expect(result.sessions).toHaveLength(1);
		const solve = result.sessions[0]!.solves![0]!;
		expect(solve.penalty).toBe(Penalty.PLUS_TWO);
		expect(solve.scramble[0]).toEqual(['R', 'U']);
		expect(solve.comment).toBe('note');
	});

	it('parses Cubic Timer text exports', () => {
		const text = '"12.34";"R U";"2025-01-02 12:00:00";"+2"\n';
		const result = parseCubicTimer(text, 'Solves_3x3_2025-01-02.txt');
		expect(result.type).toBe('CubicTimer');
		expect(result.sessions[0]!.solves).toHaveLength(1);
		expect(result.sessions[0]!.scramblerId[0]).toBe('333');
		expect(result.sessions[0]!.solves![0]!.penalty).toBe(Penalty.PLUS_TWO);
	});

	it('routes csTimer sessions without silently replacing unknown scramblers', () => {
		const result = parseCsTimer({
			properties: { sessionData: JSON.stringify({ '1': { name: '4x4 ELL', opt: { scrType: '444ell' } }, '2': { name: 'Relay', opt: { scrType: 'r234' } } }) },
			session1: [[[0, 1234], 'Rw U', 'note', 1_700_000_000]],
			session2: [[[0, 2345], 'R U | R U | Rw U', undefined, 1_700_000_001]]
		});
		expect(result.sessions[0]?.scramblerId).toEqual(['cstimer:444ell']);
		expect(result.sessions[0]?.sourceScrambler).toEqual({ source: 'cstimer', id: '444ell' });
		expect(result.sessions[0]?.solves?.[0]?.scramblerId).toEqual(['cstimer:444ell']);
		expect(result.sessions[1]?.scramblerId).toEqual(['222', '333', '444']);
		expect(result.sessions[1]?.solves?.[0]?.scramble).toEqual([['R', 'U'], ['R', 'U'], ['Rw', 'U']]);
		expect(resolveCsTimerScrambler('333o')).toMatchObject({ kind: 'custom-config', scramblerId: ['custom'] });
	});

	it('exports standard sessions in csTimer format and round-trips CMOS-only penalties', () => {
		const sessions: Session[] = [{ id: 's1', name: 'Main', scramblerId: ['333'], solveIds: ['normal', 'plus-four'], sourceSessionIds: [] }];
		const solves: SolveMap = {
			normal: { id: 'normal', timestamp: 1_700_000_000_000, time: 1234, inspectionTime: -1, scramble: [['R', 'U']], scramblerId: ['333'], penalty: Penalty.NONE, comment: 'normal' },
			'plus-four': { id: 'plus-four', timestamp: 1_700_000_001_000, time: 2000, inspectionTime: -1, scramble: [['L2']], scramblerId: ['333'], penalty: Penalty.PLUS_FOUR, comment: 'extra penalty' }
		};

		const exported = buildCsTimerExport(sessions, solves);
		const sessionData = JSON.parse((exported.properties as { sessionData: string }).sessionData) as Record<string, { name: string; opt: { scrType: string } }>;
		const rawSolves = exported.session1 as Array<[[number, number], string, string, number]>;

		expect(sessionData['1']).toEqual({ name: 'Main', opt: { scrType: '333' } });
		expect(rawSolves[1]?.[0]).toEqual([0, 6000]);
		expect(rawSolves[1]?.[2]).toContain('[CMOSTimer penalty: PLUS_FOUR; raw: 2000]');

		const imported = parseCsTimer(exported);
		expect(imported.sessions[0]?.solves?.map(solve => ({ time: solve.time, penalty: solve.penalty, comment: solve.comment }))).toEqual([
			{ time: 1234, penalty: Penalty.NONE, comment: 'normal' },
			{ time: 2000, penalty: Penalty.PLUS_FOUR, comment: 'extra penalty' }
		]);
	});
});
