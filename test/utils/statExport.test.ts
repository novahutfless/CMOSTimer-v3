import { describe, expect, it } from 'vitest';
import { Penalty, StatType, TimePrecision, type Solve, type StatConfig } from '../../types';
import { buildStatExport, findStatConfig } from '../../utils/statExport';

const stats: StatConfig[] = [{ id: 'avg5', type: StatType.AVERAGE, size: 5 }];
const solves: Solve[] = [1000, 2000, 3000, 4000, 5000].map((time, index) => ({
	id: String(index), timestamp: index, time, penalty: Penalty.NONE, inspectionTime: -1, scramble: [['R', 'U']], scramblerId: ['333']
}));

describe('stat command exports', () => {
	it('finds a statistic by keyboard-friendly shorthand', () => {
		expect(findStatConfig(stats, 'ao5', 'en')).toBe(stats[0]);
	});

	it('builds a shareable current-window export', () => {
		const output = buildStatExport(stats[0]!, solves, false, TimePrecision.CENTI, 'en');
		expect(output).toContain('Ao5: 3.00');
		expect(output).toContain('1. 1.00   R U');
		expect(output).toContain('5. 5.00   R U');
	});
});
