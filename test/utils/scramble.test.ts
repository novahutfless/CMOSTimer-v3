import { describe, it, expect } from 'vitest';
import { generateScramble, getScrambler, getScramblersByCategory } from '../../utils/scramblerRegistry';

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

		it('generates FTO scrambles through the registry', () => {
			const s = generateScramble('fto');
			expect(s).toHaveLength(1);
			expect(s[0].length).toBeGreaterThan(0);
			expect(getScrambler('fto').randomState).toBe(true);
		});

		it('validates standard moves notation', () => {
			const s = generateScramble('333')[0];
			const validChars = /^[URFDLB][2']?w?$/;
			s.forEach(move => {
				expect(move).toMatch(validChars);
			});
		});
	});

	describe('scrambler registry', () => {
		it('returns fallback scrambler for unknown id', () => {
			const scrambler = getScrambler('unknown');
			expect(scrambler.id).toBe('333');
		});

		it('groups scramblers by category', () => {
			const grouped = getScramblersByCategory();
			expect(Object.keys(grouped).length).toBeGreaterThan(0);
			expect(grouped.WCA?.length).toBeGreaterThan(0);
		});
	});
});
