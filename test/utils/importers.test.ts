import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseTime } from '../../utils/importers/parseTime';
import { parseNanoTimer } from '../../utils/importers/nanoTimer';
import { parseCubicTimer } from '../../utils/importers/cubicTimer';
import { Penalty } from '../../types';
import { parseCsTimer, resolveCsTimerScrambler } from '../../utils/importers/cstimer';

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
});
