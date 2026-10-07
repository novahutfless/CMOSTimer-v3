import { NxNPuzzle } from './nxn';
import { SkewbPuzzle } from './skewb';
import { PyraminxPuzzle } from './pyraminx';

export type PluginPuzzleKind = '222' | 'skewb' | 'pyram' | '444' | '555';
export interface PluginPuzzleMoveTable {
	kind: PluginPuzzleKind;
	faces: string[];
	faceSize: number;
	moves: string[];
	/** For each move, the source sticker index for every destination index. */
	permutations: number[][];
	/** Solved sticker colors in face order. */
	solved: string[];
}

const CUBE_FACES = ['U', 'R', 'F', 'D', 'L', 'B'];
const movesFor = (kind: PluginPuzzleKind): string[] => {
	if (kind === 'skewb') return ['R', "R'", 'L', "L'", 'U', "U'", 'B', "B'"];
	if (kind === 'pyram') return ['U', "U'", 'L', "L'", 'R', "R'", 'B', "B'", 'u', "u'", 'l', "l'", 'r', "r'", 'b', "b'"];
	const faces = kind === '222' ? ['U', 'R', 'F', 'D', 'L', 'B'] : CUBE_FACES;
	const bases = kind === '444' || kind === '555' ? [...faces, ...faces.map(face => `${face}w`)] : faces;
	return bases.flatMap(base => [base, `${base}2`, `${base}'`]);
};

const makeTable = (kind: PluginPuzzleKind): PluginPuzzleMoveTable => {
	const size = kind === '222' ? 2 : kind === '444' ? 4 : kind === '555' ? 5 : 0;
	const faces = kind === 'pyram' ? ['F', 'L', 'R', 'D'] : CUBE_FACES;
	const faceSize = size ? size * size : kind === 'skewb' ? 5 : 9;
	const solved = faces.flatMap(face => Array<string>(faceSize).fill(face));
	const moves = movesFor(kind);
	const createLabelled = (): Record<string, string[] | string[][]> => Object.fromEntries(faces.map((face, faceIndex) => {
		const labels = Array.from({ length: faceSize }, (_, index) => String(faceIndex * faceSize + index));
		return [face, size ? Array.from({ length: size }, (_, row) => labels.slice(row * size, (row + 1) * size)) : labels];
	}));
	const flatten = (state: Record<string, string[] | string[][]>): string[] => faces.flatMap(face => (state[face] as Array<string | string[]>).flat() as string[]);
	const permutations = moves.map(move => {
		const state = createLabelled();
		if (size) NxNPuzzle.applyMove(state as ReturnType<typeof NxNPuzzle.getInitialState>, move, size);
		else if (kind === 'skewb') SkewbPuzzle.applyMove(state as ReturnType<typeof SkewbPuzzle.getInitialState>, move);
		else PyraminxPuzzle.applyMove(state as ReturnType<typeof PyraminxPuzzle.getInitialState>, move);
		const permutation = flatten(state).map(Number);
		if (permutation.length !== solved.length || new Set(permutation).size !== solved.length || permutation.some(index => !Number.isInteger(index) || index < 0 || index >= solved.length)) {
			throw new Error(`Invalid ${kind} permutation for ${move}.`);
		}
		return permutation;
	});
	return { kind, faces, faceSize, moves, permutations, solved };
};

const tables = new Map<PluginPuzzleKind, PluginPuzzleMoveTable>();
export const getPluginPuzzleMoveTable = (kind: PluginPuzzleKind): PluginPuzzleMoveTable => {
	let table = tables.get(kind);
	if (!table) { table = makeTable(kind); tables.set(kind, table); }
	return table;
};
