import { describe, it, expect } from 'vitest';
import { generateScramble } from '../../utils/scramble';

describe('Scramble Utils', () => {
	describe('generateScramble', () => {
		it('generates a 3x3 scramble by default', () => {
			const s = generateScramble('333');
			expect(s).toHaveLength(1); 
			expect(Array.isArray(s[0])).toBe(true);
			expect(s[0].length).toBeGreaterThan(0);
			expect(typeof s[0][0]).toBe('string');
		});

		it('generates relay scrambles for multiple IDs', () => {
			const s = generateScramble(['333', '222']);
			expect(s).toHaveLength(2);
		});

		it('validates standard moves notation', () => {
			const s = generateScramble('333')[0];
			const validChars = /^[URFDLB][2']?w?$/;
			s.forEach(move => {
				expect(move).toMatch(validChars);
			});
		});
	});
});
