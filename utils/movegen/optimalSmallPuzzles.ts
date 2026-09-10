import { NxNPuzzle, NxNState } from '../puzzles/nxn';
import { PyraminxPuzzle, PyraState } from '../puzzles/pyraminx';
import { SkewbPuzzle, SkewbState } from '../puzzles/skewb';
import {
	MovePuzzle,
	defaultCanFollow,
	hasMinimumMoveCount,
	invertMove,
	invertSequence,
	randomWalk,
	solvePuzzle
} from '../solver';

const TWO_BY_TWO_MOVES = ['U', "U'", 'U2', 'R', "R'", 'R2', 'F', "F'", 'F2'];
const TETRAMINX_MOVES = ['U', "U'", 'L', "L'", 'R', "R'", 'B', "B'"];
const SKEWB_MOVES = ['R', "R'", 'L', "L'", 'U', "U'", 'B', "B'"];
const CUBOID_SIDE_MOVES = ['R2', 'L2', 'F2', 'B2'];

const serialize = <TState>(state: TState): string => JSON.stringify(state);
const cloneState = <TState>(state: TState): TState => JSON.parse(JSON.stringify(state)) as TState;

const byUppercaseFace = (previousMove: string | undefined, nextMove: string): boolean => {
	if (!previousMove) return true;
	return previousMove.charAt(0).toUpperCase() !== nextMove.charAt(0).toUpperCase();
};

const twoByTwoPuzzle: MovePuzzle<NxNState> = {
	moves: TWO_BY_TWO_MOVES,
	getInitialState: () => NxNPuzzle.getInitialState(2),
	applyMove: (state, move) => NxNPuzzle.applyMove(state, move, 2),
	isSolved: NxNPuzzle.isSolved,
	serialize,
	cloneState,
	invertMove,
	canFollow: defaultCanFollow
};

const tetraminxPuzzle: MovePuzzle<PyraState> = {
	moves: TETRAMINX_MOVES,
	getInitialState: () => PyraminxPuzzle.getInitialState(),
	applyMove: (state, move) => PyraminxPuzzle.applyMove(state, move),
	serialize,
	cloneState,
	invertMove,
	canFollow: byUppercaseFace
};

const skewbPuzzle: MovePuzzle<SkewbState> = {
	moves: SKEWB_MOVES,
	getInitialState: () => SkewbPuzzle.getInitialState(),
	applyMove: (state, move) => SkewbPuzzle.applyMove(state, move),
	serialize,
	cloneState,
	invertMove,
	canFollow: defaultCanFollow
};

const generateFromRandomState = <TState>(
	puzzle: MovePuzzle<TState>,
	minMoves: number,
	randomWalkLength: number,
	solveMaxDepth: number,
	aboutMoves?: number
): string[] => {
	for (let attempt = 0; attempt < 50; attempt++) {
		const { state, moves } = randomWalk(puzzle, randomWalkLength);
		if (!hasMinimumMoveCount(puzzle, state, minMoves)) continue;
		if (aboutMoves) return moves;

		const solution = solvePuzzle(puzzle, state, {
			mode: 'optimal',
			maxDepth: solveMaxDepth
		});

		if (solution) return invertSequence(solution, puzzle.invertMove);
	}

	const walk = randomWalk(puzzle, Math.max(randomWalkLength, aboutMoves ?? minMoves));
	return invertSequence(walk.moves, puzzle.invertMove);
};

const cuboidHorizontalMoves = (height: number): string[] => {
	const moves: string[] = [];
	const suffixes = ['', "'", '2'];

	for (let i = 1; i <= Math.ceil((height - 1) / 2); i++) {
		const base = i === 1 ? 'U' : i === 2 ? 'Uw' : `${i}Uw`;
		suffixes.forEach(suffix => moves.push(base + suffix));
	}

	for (let i = 1; i <= Math.floor((height - 1) / 2); i++) {
		const base = i === 1 ? 'D' : i === 2 ? 'Dw' : `${i}Dw`;
		suffixes.forEach(suffix => moves.push(base + suffix));
	}

	return moves;
};

const cuboidPuzzle = (width: number, height: number, depth: number): MovePuzzle<NxNState> => {
	const size = Math.max(width, height, depth);
	return {
		moves: [...CUBOID_SIDE_MOVES, ...cuboidHorizontalMoves(height)],
		getInitialState: () => NxNPuzzle.getInitialState(size),
		applyMove: (state, move) => NxNPuzzle.applyCuboidMove(state, move, width, height, depth, size),
		isSolved: NxNPuzzle.isSolved,
		serialize,
		cloneState,
		invertMove,
		canFollow: cuboidCanFollow
	};
};

const cuboidMoveGroup = (move: string): string => {
	const match = move.match(/^(?:\d+)?([URFDLB])/);
	const base = match?.[1] ?? move.charAt(0);
	if (base === 'U' || base === 'D') return 'y';
	if (base === 'R' || base === 'L') return 'x';
	return 'z';
};

const cuboidCanFollow = (previousMove: string | undefined, nextMove: string): boolean => {
	if (!previousMove) return true;
	return cuboidMoveGroup(previousMove) !== cuboidMoveGroup(nextMove);
};

export const generateRandomStateCuboid = (
	width: number,
	height: number,
	depth: number,
	length: number,
	minMoves = 4
): string[] => {
	const puzzle = cuboidPuzzle(width, height, depth);
	return generateFromRandomState(puzzle, minMoves, length, Math.min(10, length));
};

export const generateTwoByTwo = (): string[] =>
	generateFromRandomState(twoByTwoPuzzle, 4, 12, 11, 12);

export const generateOptimalTwoByTwo = (): string[] =>
	generateFromRandomState(twoByTwoPuzzle, 4, 11, 11);

export const generatePyraminx = (): string[] => {
	const core = generateFromRandomState(tetraminxPuzzle, 6, 11, 11, 11);
	const tips = ['u', 'l', 'r', 'b'].flatMap(tip => {
		const state = Math.floor(Math.random() * 3);
		if (state === 0) return [];
		return [state === 1 ? tip : `${tip}'`];
	});
	return [...core, ...tips];
};

export const generateSkewb = (): string[] =>
	generateFromRandomState(skewbPuzzle, 7, 12, 11, 12);
