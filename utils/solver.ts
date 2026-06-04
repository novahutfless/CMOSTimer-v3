export type SolverMode = 'optimal' | 'approximate';

export interface MovePuzzle<TState> {
	moves: string[];
	getInitialState: () => TState;
	applyMove: (state: TState, move: string) => void;
	isSolved?: (state: TState) => boolean;
	serialize?: (state: TState) => string;
	cloneState?: (state: TState) => TState;
	invertMove?: (move: string) => string;
	canFollow?: (previousMove: string | undefined, nextMove: string) => boolean;
}

export interface SolveOptions {
	mode?: SolverMode;
	maxDepth?: number;
	aboutMoves?: number;
}

interface SearchNode {
	state: unknown;
	path: string[];
}

const jsonClone = <TState>(state: TState): TState => JSON.parse(JSON.stringify(state)) as TState;

export const invertMove = (move: string): string => {
	if (move.endsWith('2')) return move;
	if (move.endsWith("'")) return move.slice(0, -1);
	return `${move}'`;
};

export const invertSequence = (moves: string[], invertSingleMove = invertMove): string[] =>
	[...moves].reverse().map(invertSingleMove);

export const defaultCanFollow = (previousMove: string | undefined, nextMove: string): boolean => {
	if (!previousMove) return true;
	return previousMove.charAt(0) !== nextMove.charAt(0);
};

const applyToClone = <TState>(puzzle: MovePuzzle<TState>, state: TState, move: string): TState => {
	const clone = (puzzle.cloneState ?? jsonClone)(state);
	puzzle.applyMove(clone, move);
	return clone;
};

const keyFor = <TState>(puzzle: MovePuzzle<TState>, state: TState): string =>
	(puzzle.serialize ?? JSON.stringify)(state);

const pathToSolution = (
	fromStart: string[],
	fromSolved: string[],
	invertSingleMove: (move: string) => string
): string[] => fromStart.concat(invertSequence(fromSolved, invertSingleMove));

const expandFrontier = <TState>(
	puzzle: MovePuzzle<TState>,
	frontier: Map<string, SearchNode>,
	visitedOwn: Map<string, string[]>,
	visitedOther: Map<string, string[]>,
	fromStartSide: boolean,
	maxDepth: number
): { next: Map<string, SearchNode>; solution?: string[] } => {
	const next = new Map<string, SearchNode>();
	const invertSingleMove = puzzle.invertMove ?? invertMove;
	const canFollow = puzzle.canFollow ?? defaultCanFollow;

	for (const node of frontier.values()) {
		const previousMove = node.path[node.path.length - 1];
		for (const move of puzzle.moves) {
			if (!canFollow(previousMove, move)) continue;

			const nextState = applyToClone(puzzle, node.state as TState, move);
			const key = keyFor(puzzle, nextState);
			if (visitedOwn.has(key)) continue;

			const path = [...node.path, move];
			const otherPath = visitedOther.get(key);
			if (otherPath) {
				const solution = fromStartSide
					? pathToSolution(path, otherPath, invertSingleMove)
					: pathToSolution(otherPath, path, invertSingleMove);
				if (solution.length > maxDepth) continue;

				return {
					next,
					solution
				};
			}

			visitedOwn.set(key, path);
			next.set(key, { state: nextState, path });
		}
	}

	return { next };
};

export const solvePuzzle = <TState>(
	puzzle: MovePuzzle<TState>,
	initialState: TState,
	options: SolveOptions = {}
): string[] | null => {
	const mode = options.mode ?? 'optimal';
	const maxDepth = options.maxDepth ?? options.aboutMoves ?? 12;
	const solvedState = puzzle.getInitialState();
	const initialKey = keyFor(puzzle, initialState);
	const solvedKey = keyFor(puzzle, solvedState);

	if (initialKey === solvedKey || puzzle.isSolved?.(initialState)) return [];

	let startFrontier = new Map<string, SearchNode>([[initialKey, { state: initialState, path: [] }]]);
	let solvedFrontier = new Map<string, SearchNode>([[solvedKey, { state: solvedState, path: [] }]]);
	const visitedStart = new Map<string, string[]>([[initialKey, []]]);
	const visitedSolved = new Map<string, string[]>([[solvedKey, []]]);
	let startDepth = 0;
	let solvedDepth = 0;

	for (let depth = 0; depth < maxDepth; depth++) {
		const expandStart = startDepth <= solvedDepth;
		const result = expandStart
			? expandFrontier(puzzle, startFrontier, visitedStart, visitedSolved, true, maxDepth)
			: expandFrontier(puzzle, solvedFrontier, visitedSolved, visitedStart, false, maxDepth);

		if (result.solution) {
			return mode === 'approximate' && options.aboutMoves
				? padSolution(result.solution, puzzle.moves, options.aboutMoves, puzzle.invertMove)
				: result.solution;
		}

		if (expandStart) {
			startFrontier = result.next;
			startDepth++;
		} else {
			solvedFrontier = result.next;
			solvedDepth++;
		}
	}

	return null;
};

export const padSolution = (
	solution: string[],
	moves: string[],
	aboutMoves: number,
	invertSingleMove = invertMove
): string[] => {
	const padded = [...solution];
	while (padded.length + 1 < aboutMoves) {
		const move = moves[Math.floor(Math.random() * moves.length)];
		const pair = Math.random() < 0.5 ? [move, invertSingleMove(move)] : [invertSingleMove(move), move];
		const index = Math.floor(Math.random() * (padded.length + 1));
		padded.splice(index, 0, ...pair);
	}
	return padded;
};

export const isStateWithinMoveCount = <TState>(
	puzzle: MovePuzzle<TState>,
	state: TState,
	maxMoves: number
): boolean => solvePuzzle(puzzle, state, { mode: 'optimal', maxDepth: maxMoves }) !== null;

export const hasMinimumMoveCount = <TState>(
	puzzle: MovePuzzle<TState>,
	state: TState,
	minMoves: number
): boolean => !isStateWithinMoveCount(puzzle, state, minMoves - 1);

export const applyMoves = <TState>(
	puzzle: MovePuzzle<TState>,
	moves: string[],
	state = puzzle.getInitialState()
): TState => {
	moves.forEach(move => puzzle.applyMove(state, move));
	return state;
};

export const randomWalk = <TState>(
	puzzle: MovePuzzle<TState>,
	length: number
): { state: TState; moves: string[] } => {
	const moves: string[] = [];
	const canFollow = puzzle.canFollow ?? defaultCanFollow;
	let previousMove: string | undefined;

	while (moves.length < length) {
		const move = puzzle.moves[Math.floor(Math.random() * puzzle.moves.length)];
		if (!canFollow(previousMove, move)) continue;
		moves.push(move);
		previousMove = move;
	}

	return { moves, state: applyMoves(puzzle, moves) };
};
