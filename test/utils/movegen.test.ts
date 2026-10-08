import { describe, it, expect, vi } from 'vitest';
import { rand, pick } from '../../utils/movegen/helpers';
import { generateCustom } from '../../utils/movegen/custom';
import { generateNxN } from '../../utils/movegen/nxn';
import { generatePyraminx } from '../../utils/movegen/pyraminx';
import { generateSkewb } from '../../utils/movegen/skewb';
import { generateSquare1 } from '../../utils/movegen/square1';
import { generateMegaminx } from '../../utils/movegen/megaminx';
import { generateCuboid } from '../../utils/movegen/cuboid';
import { generateClock } from '../../utils/movegen/clock';
import { generateFTO } from '../../utils/movegen/fto';
import { generateRandomStateCuboid } from '../../utils/movegen/optimalSmallPuzzles';
import { hasFewestMovesPaddingCancellation } from '../../utils/movegen/threeByThreeRandomState';

describe('Movegen Helpers', () => {
	it('rand returns values in range', () => {
		const val = rand(5);
		expect(val).toBeGreaterThanOrEqual(0);
		expect(val).toBeLessThan(5);
	});

	it('pick selects an element from array', () => {
		const arr = ['a', 'b', 'c'];
		const val = pick(arr);
		expect(arr).toContain(val);
	});
});

describe('Movegen Generators', () => {
	it('detects cancellations at FMC padding boundaries', () => {
		expect(hasFewestMovesPaddingCancellation(['F2', 'U'])).toBe(true);
		expect(hasFewestMovesPaddingCancellation(['U', "R'"])).toBe(true);
		expect(hasFewestMovesPaddingCancellation(['U', 'F'])).toBe(false);
	});
	it('generates custom scrambles with no duplicate consecutive bases', () => {
		const moves = generateCustom({ moves: 'U R F', opposites: 'U-D R-L', length: 20 });
		expect(moves.length).toBe(20);
		for (let i = 1; i < moves.length; i++) {
			const prevBase = moves[i - 1].replace(/['2w]/g, '');
			const currBase = moves[i].replace(/['2w]/g, '');
			expect(currBase).not.toBe(prevBase);
		}
	});

	it('generates NxN scrambles with valid move format', () => {
		const moves = generateNxN(4, 40);
		expect(moves).toHaveLength(40);
		moves.forEach(m => {
			expect(m).toMatch(/^(\d+)?[URFDLB]w?(?:'|2)?$/);
		});
	});

	it('uses only Rw, Uw, and Fw for 4x4 wide turns while keeping opposite outer turns', () => {
		const spy = vi.spyOn(Math, 'random');
		try {
			// Select L/D/B on each axis, first as wide turns, then as outer turns.
			for (const wide of [0.75, 0.25]) {
				for (const axis of [0, 0.4, 0.8]) {
					spy.mockReturnValueOnce(axis).mockReturnValueOnce(0.75)
						.mockReturnValueOnce(0).mockReturnValueOnce(wide);
					if (wide > 0.5) spy.mockReturnValueOnce(0);
				}
			}
			expect(generateNxN(4, 6)).toEqual(['Rw', 'Uw', 'Fw', 'L', 'D', 'B']);
		} finally {
			spy.mockRestore();
		}
	});

	it('generates pyraminx scrambles with core and optional tip moves', () => {
		const moves = generatePyraminx();
		expect(moves.length).toBeGreaterThanOrEqual(11);
		expect(moves.length).toBeLessThanOrEqual(15);
		moves.forEach(m => {
			expect(m).toMatch(/^[ULRBulrb]'?$/);
		});
	});

	it('generates skewb scrambles with valid moves', () => {
		const moves = generateSkewb();
		expect(moves).toHaveLength(12);
		moves.forEach(m => {
			expect(m).toMatch(/^[RLUB]'?$/);
		});
	});

	it('generates square-1 scrambles with pairs and slash', () => {
		const moves = generateSquare1();
		expect(moves).toHaveLength(24);
		for (let i = 0; i < moves.length; i++) {
			if (i % 2 === 0) expect(moves[i]).toMatch(/^\(-?\d+,\s?-?\d+\)$/);
			else expect(moves[i]).toBe('/');
		}
	});

	it('generates megaminx scrambles with expected length', () => {
		const moves = generateMegaminx();
		expect(moves).toHaveLength(77);
		moves.forEach(m => {
			expect(m).toMatch(/^(R\+\+|R--|D\+\+|D--|U'?)$/);
		});
	});

	it.each([0.25, 0.75])('matches Megaminx row endings to the final D turn (random=%s)', random => {
		const spy = vi.spyOn(Math, 'random').mockReturnValue(random);
		try {
			const moves = generateMegaminx();
			for (let row = 0; row < 7; row++) {
				const start = row * 11;
				for (let pair = 0; pair < 5; pair++) {
					expect(moves[start + pair * 2]).toMatch(/^R(\+\+|--)$/);
					expect(moves[start + pair * 2 + 1]).toMatch(/^D(\+\+|--)$/);
				}
				expect(moves[start + 10]).toBe(moves[start + 9] === 'D++' ? 'U' : "U'");
			}
		} finally {
			spy.mockRestore();
		}
	});

	it('generates cuboid scrambles with expected length', () => {
		const moves = generateCuboid(3, 4, 3, 20);
		expect(moves).toHaveLength(20);
		moves.forEach(m => {
			expect(m).toMatch(/^(R2|L2|F2|B2|(\d+)?[UD]w?'?2?)$/);
		});
	});

	it('generates random-state cuboid scrambles without adjacent same-axis turns', () => {
		const moves = generateRandomStateCuboid(2, 3, 2, 15);
		const group = (move: string): string => {
			const base = move.match(/^(?:\d+)?([URFDLB])/)?.[1] ?? move.charAt(0);
			if (base === 'U' || base === 'D') return 'y';
			if (base === 'R' || base === 'L') return 'x';
			return 'z';
		};

		expect(moves.length).toBeGreaterThanOrEqual(4);
		expect(moves.length).toBeLessThanOrEqual(15);
		for (let i = 1; i < moves.length; i++) 
			expect(group(moves[i])).not.toBe(group(moves[i - 1]));
	});

	it('generates clock scrambles for variants', () => {
		const moves = generateClock('wca');
		expect(moves).toHaveLength(15);
		moves.forEach(m => {
			expect(m).toMatch(/^(?:[URDL]{1,2}|ALL|y2)\d*(?:\+|-|')?$/);
		});

		const no0 = generateClock('no0');
		expect(no0.some(m => m.includes('0+'))).toBe(false);
	});

	it('generates FTO random-state scrambles with supported outer moves', () => {
		const moves = generateFTO();
		expect(moves.length).toBeGreaterThan(0);
		moves.forEach(m => {
			expect(m).toMatch(/^(U|L|F|R|BR|B|BL|D)'?$/);
		});
	}, 15_000);
});
