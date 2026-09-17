import { describe, expect, it } from 'vitest';
import { getPngFilename } from '../../utils/chartExport';

describe('getPngFilename', () => {
	it('creates a safe PNG filename', () => {
		expect(getPngFilename('  My / session: chart?  ')).toBe('My-session-chart.png');
	});

	it('falls back to a chart name when the supplied name is empty', () => {
		expect(getPngFilename('   ')).toBe('chart.png');
	});
});
