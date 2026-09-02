import { describe, it, expect } from 'vitest';
import { generateScramble, getScrambler, getScramblersByCategory, shouldInitializeScramble } from '../../utils/scramblerRegistry';

describe('Scramble Utils', () => {
	describe('generateScramble', () => {
		it('waits for persisted session data before initializing scramble history', () => {
			expect(shouldInitializeScramble(false, 0, ['333'])).toBe(false);
			expect(shouldInitializeScramble(true, 0, ['pyram'])).toBe(true);
			expect(shouldInitializeScramble(true, 1, ['pyram'])).toBe(false);
		});

		it('generates a 3x3 scramble by default', () => {
			const s = generateScramble('333');
			expect(s).toHaveLength(1); 
			expect(Array.isArray(s[0])).toBe(true);
			expect(s[0].length).toBeGreaterThan(0);
			expect(typeof s[0][0]).toBe('string');
		});

		it('generates random-state 3x3 training scrambles', () => {
			for (const id of [
				'333', '333fm', 'edges', 'corners', 'll', 'f2l', 'zbll', 'zzll', 'zbls', 'ttll', 'eols', 'wvls', 'vls',
				'lse', 'cmll', 'cll', 'coll', 'ell', 'pll', 'oll', '2gll', 'sbrx', 'mt3qb', 'mteole', 'mttdr',
				'mt6cp', 'mtl5ep', 'mtcdrll', 'easyc', 'easyxc', 'eoline', 'eocross'
			]) {
				const scramble = generateScramble(id)[0];
				expect(scramble.length).toBeGreaterThan(0);
				expect(getScrambler(id).randomState).toBe(true);
				scramble.forEach(move => expect(move).toMatch(/^[URFDLB][2']?$/));
			}
		}, 30_000);

		it('generates relay scrambles for multiple IDs', () => {
			const s = generateScramble(['333', '222']);
			expect(s).toHaveLength(2);
		});

		it('generates FTO scrambles through the registry', () => {
			const s = generateScramble('fto');
			expect(s).toHaveLength(1);
			expect(s[0].length).toBeGreaterThan(0);
			expect(getScrambler('fto').randomState).toBe(true);
		}, 15_000);

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
