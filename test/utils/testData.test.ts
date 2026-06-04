import { describe, it, expect } from 'vitest';
import { generateTestSessions } from '../../utils/testData';

describe('Test Data Utils', () => {
	it('generates standard sessions list', () => {
		const sessions = generateTestSessions();
		expect(sessions.length).toBeGreaterThan(5);
		expect(sessions.every(s => typeof s.id === 'string' && s.id.length > 0)).toBe(true);
		expect(sessions.map(s => s.scramblerId)).toContain('333');
	});
});
