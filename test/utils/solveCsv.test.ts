import { describe, expect, it } from 'vitest';
import { Penalty, Session, Solve, SolveMap } from '../../types';
import { buildSolvesCsv } from '../../utils/solveCsv';

const solve = (id: string, overrides: Partial<Solve> = {}): Solve => ({
	id,
	timestamp: Date.UTC(2026, 0, 2, 3, 4, 5),
	time: 1234,
	inspectionTime: 5000,
	scramble: [['R', 'U'], ['L2']],
	scramblerId: ['333', '222'],
	penalty: Penalty.NONE,
	...overrides
});

describe('buildSolvesCsv', () => {
	it('keeps solve details and session context in spreadsheet-safe rows', () => {
		const sessions: Session[] = [
			{ id: 's1', name: 'Practice, main', scramblerId: ['333'], solveIds: ['a'], sourceSessionIds: [] },
			{ id: 's2', name: 'Shared', scramblerId: ['333'], solveIds: ['a'], sourceSessionIds: [] }
		];
		const solves: SolveMap = {
			a: solve('a', { comment: 'quote "text', tags: ['pll', 'fast'], phases: [{ duration: 1234, cumulative: 1234 }] }),
			orphan: solve('orphan', { timestamp: Date.UTC(2025, 0, 1), penalty: Penalty.DNF })
		};

		const rows = buildSolvesCsv(sessions, solves).split('\r\n');

		expect(rows[0]).toContain('final_time_ms');
		expect(rows).toHaveLength(4);
		expect(rows[1]).toContain('"Practice, main"');
		expect(rows[1]).toContain('1234');
		expect(rows[1]).toContain('R U | L2');
		expect(rows[1]).toContain('"quote ""text"');
		expect(rows[2]).toContain('Shared');
		expect(rows[3]).toMatch(/^,,orphan,/);
		expect(rows[3]).toContain(',DNF,');
	});
});
