import { describe, it, expect } from 'vitest';
import { rand, pick } from '../../utils/movegen/helpers';
import { generateCustom } from '../../utils/movegen/custom';
import { generateNxN } from '../../utils/movegen/nxn';
import { generatePyraminx } from '../../utils/movegen/pyraminx';
import { generateSkewb } from '../../utils/movegen/skewb';
import { generateSquare1 } from '../../utils/movegen/square1';
import { generateMegaminx } from '../../utils/movegen/megaminx';
import { generateCuboid } from '../../utils/movegen/cuboid';
import { generateClock } from '../../utils/movegen/clock';

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
		expect(moves).toHaveLength(10);
		moves.forEach(m => {
			expect(m).toMatch(/^[RLUB]'?$/);
		});
	});

	it('generates square-1 scrambles with pairs and slash', () => {
		const moves = generateSquare1();
		expect(moves).toHaveLength(24);
		for (let i = 0; i < moves.length; i++) {
			if (i % 2 === 0) expect(moves[i]).toMatch(/^\(-?\d+, -?\d+\)$/);
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

	it('generates cuboid scrambles with expected length', () => {
		const moves = generateCuboid(3, 4, 3, 20);
		expect(moves).toHaveLength(20);
		moves.forEach(m => {
			expect(m).toMatch(/^(R2|L2|F2|B2|(\d+)?[UD]w?'?2?)$/);
		});
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
});
