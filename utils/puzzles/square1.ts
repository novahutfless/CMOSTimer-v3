import { PuzzleInterface } from './types';

export type Square1PieceType = 'corner' | 'edge';
export type Square1LayerName = 'top' | 'bottom';

export type Square1Piece = {
	id: string;
	type: Square1PieceType;
	topColor: 'U' | 'D';
	sideColors: Array<'F' | 'R' | 'B' | 'L'>;
};

export type Square1Layer = Square1Piece[];

export type Square1State = {
	top: Square1Layer;
	bottom: Square1Layer;
	topOffset: number;
	bottomOffset: number;
};

const pieceSize = (piece: Square1Piece): number => piece.type === 'corner' ? 2 : 1;
const normalizeUnits = (units: number): number => ((units % 12) + 12) % 12;

const makePiece = (
	id: string,
	type: Square1PieceType,
	topColor: 'U' | 'D',
	sideColors: Array<'F' | 'R' | 'B' | 'L'>
): Square1Piece => ({ id, type, topColor, sideColors });

const makeSolvedLayer = (prefix: 'U' | 'D', topColor: 'U' | 'D'): Square1Layer => [
	makePiece(`${prefix}FRc`, 'corner', topColor, ['F', 'R']),
	makePiece(`${prefix}Re`, 'edge', topColor, ['R']),
	makePiece(`${prefix}RBc`, 'corner', topColor, ['R', 'B']),
	makePiece(`${prefix}Be`, 'edge', topColor, ['B']),
	makePiece(`${prefix}BLc`, 'corner', topColor, ['B', 'L']),
	makePiece(`${prefix}Le`, 'edge', topColor, ['L']),
	makePiece(`${prefix}LFc`, 'corner', topColor, ['L', 'F']),
	makePiece(`${prefix}Fe`, 'edge', topColor, ['F']),
];

export const cloneSquare1State = (state: Square1State): Square1State => ({
	top: state.top.map(piece => ({ ...piece })),
	bottom: state.bottom.map(piece => ({ ...piece })),
	topOffset: state.topOffset,
	bottomOffset: state.bottomOffset
});

const getInitialStateSquare1 = (): Square1State => ({
	top: makeSolvedLayer('U', 'U'),
	bottom: makeSolvedLayer('D', 'D'),
	topOffset: 0,
	bottomOffset: 0
});

const layerHasCut = (layer: Square1Layer, units: number, offset = 0): boolean => {
	const target = normalizeUnits(units);
	let position = normalizeUnits(offset);
	if (position === target) return true;

	for (const piece of layer) {
		position = normalizeUnits(position + pieceSize(piece));
		if (position === target) return true;
	}

	return false;
};

export const canRotateSquare1Layer = (layer: Square1Layer, units: number): boolean =>
	layer.length > 0 && Number.isInteger(units);

const normalizeLayerToCut = (layer: Square1Layer, offset: number, cut: number): Square1Layer => {
	const target = normalizeUnits(cut);
	let position = normalizeUnits(offset);
	if (position === target) return [...layer];

	for (let i = 0; i < layer.length; i++) {
		position = normalizeUnits(position + pieceSize(layer[i]));
		if (position === target) return [...layer.slice(i + 1), ...layer.slice(0, i + 1)];
	}

	return [...layer];
};

const splitLayerForSlash = (layer: Square1Layer, offset: number): [Square1Layer, Square1Layer] => {
	const ordered = normalizeLayerToCut(layer, offset, 0);
	let position = 0;

	for (let i = 0; i < ordered.length; i++) {
		position += pieceSize(ordered[i]);
		if (position === 6) return [ordered.slice(0, i + 1), ordered.slice(i + 1)];
	}

	return [ordered, []];
};

export const rotateSquare1Layer = (layer: Square1Layer, _units: number): Square1Layer => [...layer];

export const canSlashSquare1 = (state: Square1State): boolean =>
	layerHasCut(state.top, 0, state.topOffset) &&
	layerHasCut(state.top, 6, state.topOffset) &&
	layerHasCut(state.bottom, 0, state.bottomOffset) &&
	layerHasCut(state.bottom, 6, state.bottomOffset);

export const applySquare1Tuple = (state: Square1State, topUnits: number, bottomUnits: number): boolean => {
	if (!canRotateSquare1Layer(state.top, topUnits) || !canRotateSquare1Layer(state.bottom, bottomUnits)) return false;

	state.topOffset = normalizeUnits(state.topOffset + topUnits);
	state.bottomOffset = normalizeUnits(state.bottomOffset - bottomUnits);
	return true;
};

export const applySquare1Slash = (state: Square1State): boolean => {
	if (!canSlashSquare1(state)) return false;

	const [topLeft, topRight] = splitLayerForSlash(state.top, state.topOffset);
	const [bottomLeft, bottomRight] = splitLayerForSlash(state.bottom, state.bottomOffset);

	state.top = [...topLeft, ...bottomLeft.slice().reverse()];
	state.bottom = [...topRight.slice().reverse(), ...bottomRight];
	state.topOffset = 0;
	state.bottomOffset = 0;
	return true;
};

const parseTuple = (move: string): [number, number] | null => {
	const match = move.match(/^\((-?\d+)\s*,\s*(-?\d+)\)$/);
	if (!match) return null;

	return [parseInt(match[1], 10), parseInt(match[2], 10)];
};

const applyMoveSquare1 = (state: Square1State, move: string): void => {
	if (move === '/') {
		applySquare1Slash(state);
		return;
	}

	const tuple = parseTuple(move);
	if (tuple) applySquare1Tuple(state, tuple[0], tuple[1]);
};

export const Square1Puzzle: PuzzleInterface<Square1State> = {
	getInitialState: () => getInitialStateSquare1(),
	applyMove: (state, move) => applyMoveSquare1(state, move)
};
