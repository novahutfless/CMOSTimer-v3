import { describe, it, expect } from 'vitest';
import { getScrambleState } from '../../utils/cube';
import { PuzzleType } from '../../types';
import { NxNPuzzle } from '../../utils/puzzles/nxn';
import { PYRAMINX_STICKERS, PyraminxPuzzle } from '../../utils/puzzles/pyraminx';
import { SkewbPuzzle } from '../../utils/puzzles/skewb';
import { applySquare1Tuple, canSlashSquare1, Square1Puzzle, Square1State } from '../../utils/puzzles/square1';
import { generateSquare1 } from '../../utils/movegen/square1';
import { generateMegaminx } from '../../utils/movegen/megaminx';
import { MegaminxPuzzle, MegaminxState } from '../../utils/puzzles/megaminx';
import { FTOPuzzle, FTOState } from '../../utils/puzzles/fto';
import { generateFTO } from '../../utils/movegen/fto';

describe('Cube Utils', () => {
	it('returns null for no-visual puzzles', () => {
		expect(getScrambleState('R U', PuzzleType.NO_VISUAL)).toBeNull();
	});

	it('returns initial state for empty scramble', () => {
		const state = getScrambleState('', PuzzleType.THREE);
		const initial = NxNPuzzle.getInitialState(3);
		expect(state).toEqual(initial);
	});

	it('applies moves for pyraminx scrambles', () => {
		const initial = PyraminxPuzzle.getInitialState();
		const state = getScrambleState('U', PuzzleType.PYRAMINX);
		expect(state).not.toEqual(initial);
	});

	it('applies pyraminx full-layer and tip-only moves', () => {
		const fullLayer = PyraminxPuzzle.getInitialState();
		const tipOnly = PyraminxPuzzle.getInitialState();

		PyraminxPuzzle.applyMove(fullLayer, 'U');
		PyraminxPuzzle.applyMove(tipOnly, 'u');

		expect(fullLayer.F[0]).toBe('R');
		expect(fullLayer.L[4]).toBe('F');
		expect(fullLayer.R[0]).toBe('L');
		expect(fullLayer.F[1]).toBe('R');
		expect(fullLayer.F[2]).toBe('R');
		expect(fullLayer.F[3]).toBe('R');

		expect(tipOnly.F[0]).toBe('R');
		expect(tipOnly.L[4]).toBe('F');
		expect(tipOnly.R[0]).toBe('L');
		expect(tipOnly.F[1]).toBe('F');
		expect(tipOnly.L[5]).toBe('L');
		expect(tipOnly.R[2]).toBe('R');
	});

	it('keeps pyraminx moves reversible and order three', () => {
		const initial = PyraminxPuzzle.getInitialState();
		const inverseState = PyraminxPuzzle.getInitialState();
		const orderState = PyraminxPuzzle.getInitialState();

		PyraminxPuzzle.applyMove(inverseState, 'R');
		PyraminxPuzzle.applyMove(inverseState, "R'");

		PyraminxPuzzle.applyMove(orderState, 'b');
		PyraminxPuzzle.applyMove(orderState, 'b');
		PyraminxPuzzle.applyMove(orderState, 'b');

		expect(inverseState).toEqual(initial);
		expect(orderState).toEqual(initial);
	});

	it('applies skewb fixed-corner moves in conventional direction', () => {
		const bState = SkewbPuzzle.getInitialState();
		const rPrimeState = SkewbPuzzle.getInitialState();
		const lPrimeState = SkewbPuzzle.getInitialState();
		const uPrimeState = SkewbPuzzle.getInitialState();

		SkewbPuzzle.applyMove(bState, 'B');
		SkewbPuzzle.applyMove(rPrimeState, "R'");
		SkewbPuzzle.applyMove(lPrimeState, "L'");
		SkewbPuzzle.applyMove(uPrimeState, "U'");

		expect(bState.L[0]).toBe('B');
		expect(bState.D[0]).toBe('L');
		expect(bState.B[0]).toBe('D');
		expect(bState.L[4]).toBe('B');
		expect(bState.D[4]).toBe('L');
		expect(bState.B[3]).toBe('D');

		expect(rPrimeState.B[0]).toBe('D');
		expect(rPrimeState.D[0]).toBe('R');
		expect(rPrimeState.R[0]).toBe('B');

		expect(lPrimeState.F[0]).toBe('D');
		expect(lPrimeState.D[0]).toBe('L');
		expect(lPrimeState.L[0]).toBe('F');

		expect(uPrimeState.L[0]).toBe('B');
		expect(uPrimeState.B[0]).toBe('U');
		expect(uPrimeState.U[0]).toBe('L');
	});

	it('keeps skewb moves reversible and order three', () => {
		const initial = SkewbPuzzle.getInitialState();
		const inverseState = SkewbPuzzle.getInitialState();
		const orderState = SkewbPuzzle.getInitialState();

		SkewbPuzzle.applyMove(inverseState, 'R');
		SkewbPuzzle.applyMove(inverseState, "R'");

		SkewbPuzzle.applyMove(orderState, 'L');
		SkewbPuzzle.applyMove(orderState, 'L');
		SkewbPuzzle.applyMove(orderState, 'L');

		expect(inverseState).toEqual(initial);
		expect(orderState).toEqual(initial);
	});

	it('applies generated square-1 scrambles without illegal slash states', () => {
		const moves = generateSquare1();
		const state = Square1Puzzle.getInitialState();

		moves.forEach(move => {
			if (move === '/') expect(canSlashSquare1(state)).toBe(true);
			Square1Puzzle.applyMove(state, move);
		});

		expect((state as Square1State).top.length + state.bottom.length).toBe(16);
		expect(getScrambleState(moves, PuzzleType.SQUARE1)).toEqual(state);
	});

	it('checks square-1 slash legality after free layer turns', () => {
		const expectSlashAfter = (top: number, bottom: number, expected: boolean): void => {
			const state = Square1Puzzle.getInitialState();
			applySquare1Tuple(state, top, bottom);
			expect(canSlashSquare1(state)).toBe(expected);
		};

		expect(canSlashSquare1(Square1Puzzle.getInitialState())).toBe(true);
		expectSlashAfter(1, 0, true);
		expectSlashAfter(2, 0, false);
		expectSlashAfter(0, -1, true);
		expectSlashAfter(0, 1, false);
		expectSlashAfter(-1, 0, false);
	});

	it('parses square-1 strings without breaking tuples on spaces', () => {
		const compact = '(4,0) / (-1,-1) / (-3,0) / (3,0) / (-5,-5) / (0,-3) / (2,0) / (-3,-3) / (-4,0) / (-5,0) / (-4,-5) / (-2,0) / (4,0)';
		const spaced = compact.replaceAll(',', ', ');

		expect(getScrambleState(spaced, PuzzleType.SQUARE1)).toEqual(getScrambleState(compact, PuzzleType.SQUARE1));
	});

	it('accepts known valid square-1 cubeshape scrambles', () => {
		const scrambles = [
			'(4,0) / (-1,-1) / (-3,0) / (3,0) / (-5,-5) / (0,-3) / (2,0) / (-3,-3) / (-4,0) / (-5,0) / (-4,-5) / (-2,0) / (4,0)',
			'(4,3) / (-4,2) / (0,-3) / (6,-3) / (1,-2) / (-1,0) / (3,0) / (1,-4) / (4,0) / (2,0) / (0,-5) / (-3,0) / (4,0)'
		];
		const parse = (scramble: string): string[] => scramble.match(/\(-?\d+\s*,\s*-?\d+\)|\//g) || [];

		scrambles.forEach(scramble => {
			const state = Square1Puzzle.getInitialState();
			parse(scramble).forEach(move => {
				if (move === '/') expect(canSlashSquare1(state)).toBe(true);
				Square1Puzzle.applyMove(state, move);
			});
			expect(state.top.length + state.bottom.length).toBe(16);
		});
	});

	it('resolves generated megaminx scrambles to visual state', () => {
		const state = getScrambleState(generateMegaminx(), PuzzleType.MEGAMINX) as MegaminxState;

		expect(state).toBeTruthy();
		expect(Object.keys(state)).toHaveLength(12);
		expect(state.U).toHaveLength(11);
	});

	it('megaminx pochmann moves separate stickers within faces', () => {
		const state = getScrambleState(['R++'], PuzzleType.MEGAMINX) as MegaminxState;

		expect(new Set(state.L)).toEqual(new Set(['L']));
		expect(new Set(state.U).size).toBeGreaterThan(1);
		expect(new Set(state.F).size).toBeGreaterThan(1);
	});

	it('exposes complete triangular geometry for the 3D pyraminx', () => {
		expect(PYRAMINX_STICKERS).toHaveLength(36);
		expect(PYRAMINX_STICKERS.every(sticker => sticker.corners.length === 3)).toBe(true);
		PYRAMINX_STICKERS.forEach(sticker => {
			sticker.corners.forEach(corner => {
				expect(Object.values(corner).reduce((sum, weight) => sum + weight, 0)).toBe(3);
			});
		});
	});

	it('keeps all Megaminx stickers and reverses Pochmann moves', () => {
		const solved = MegaminxPuzzle.getInitialState();
		const state = MegaminxPuzzle.getInitialState();
		['R++', 'D--', "U'", 'U', 'D++', 'R--'].forEach(move => MegaminxPuzzle.applyMove(state, move));

		expect(state).toEqual(solved);

		const scrambled = getScrambleState(generateMegaminx(), PuzzleType.MEGAMINX) as MegaminxState;
		const counts = Object.values(scrambled).flat().reduce<Record<string, number>>((result, sticker) => {
			result[sticker] = (result[sticker] || 0) + 1;
			return result;
		}, {});
		expect(Object.values(counts)).toEqual(Array(12).fill(11));
	});

	it('keeps cuboid visible sticker counts stable after mixed moves', () => {
		const state = getScrambleState(['U2', 'F2'], PuzzleType.TWO_BY_TWO_BY_FOUR) as ReturnType<typeof NxNPuzzle.getInitialState>;
		const visible = [
			...state.U.slice(0, 2).flatMap(row => row.slice(0, 2)),
			...state.D.slice(0, 2).flatMap(row => row.slice(0, 2)),
			...state.F.slice(0, 4).flatMap(row => row.slice(0, 2)),
			...state.B.slice(0, 4).flatMap(row => row.slice(0, 2)),
			...state.L.slice(0, 4).flatMap(row => row.slice(0, 2)),
			...state.R.slice(0, 4).flatMap(row => row.slice(0, 2)),
		];
		const counts = visible.reduce<Record<string, number>>((acc, sticker) => {
			acc[sticker] = (acc[sticker] || 0) + 1;
			return acc;
		}, {});

		expect(counts).toEqual({ U: 4, D: 4, F: 8, B: 8, L: 8, R: 8 });
	});

	it('applies cuboid side half-turns visibly', () => {
		const initial = getScrambleState([], PuzzleType.TWO_BY_TWO_BY_FOUR);
		(['R2', 'L2', 'F2', 'B2'] as const).forEach(move => {
			const state = getScrambleState([move], PuzzleType.TWO_BY_TWO_BY_FOUR);
			expect(state).not.toEqual(initial);
		});
	});

	it('applies FTO moves and keeps face turns order three', () => {
		const initial = FTOPuzzle.getInitialState();
		const orderState = FTOPuzzle.getInitialState();
		const generatedState = getScrambleState(generateFTO(), PuzzleType.FTO) as FTOState;

		FTOPuzzle.applyMove(orderState, 'R');
		FTOPuzzle.applyMove(orderState, 'R');
		FTOPuzzle.applyMove(orderState, 'R');

		expect(orderState).toEqual(initial);
		expect(generatedState).toHaveLength(72);
	}, 15_000);
});
