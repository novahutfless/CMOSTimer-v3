
import { describe, it, expect } from 'vitest';
import { generateScramble, getScrambler } from '../../utils/scramble';

describe('Scramble Utils', () => {
	describe('generateScramble', () => {
		it('generates a 3x3 scramble by default', () => {
			// generateScramble returns string[][] (array of move arrays)
			const s = generateScramble('333');
			expect(s).toHaveLength(1); 
			expect(Array.isArray(s[0])).toBe(true);
			expect(s[0].length).toBeGreaterThan(0);
			expect(typeof s[0][0]).toBe('string');
		});

		it('generates correct length for 3x3 (20 moves)', () => {
			const def = getScrambler('333');
			const moves = def.generate();
			expect(moves).toHaveLength(20); 
		});

		it('generates correct length for 2x2 (9 moves)', () => {
			const def = getScrambler('222');
			const moves = def.generate();
			expect(moves).toHaveLength(9); 
		});

		it('generates relay scrambles for multiple IDs', () => {
			const s = generateScramble(['333', '222']);
			expect(s).toHaveLength(2);
			expect(s[0].length).toBe(20); // 3x3
			expect(s[1].length).toBe(9);  // 2x2
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
