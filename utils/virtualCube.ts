import { PuzzleType } from '../types';

const MIN_VIRTUAL_CUBE_SIZE = 2;
const MAX_VIRTUAL_CUBE_SIZE = 7;

export type VirtualPuzzle =
	| { kind: 'cube'; size: number }
	| { kind: 'pyraminx' }
	| { kind: 'skewb' };

/** Returns the edge length for regular cubes supported by the keyboard-driven 3D view. */
export const getVirtualCubeSize = (puzzleType: string): number | null => {
	const shortMatch = puzzleType.match(/^(\d+)x\1$/);
	const longMatch = puzzleType.match(/^(\d+)x\1x\1$/);
	const match = shortMatch || longMatch;
	if (!match) return null;

	const size = Number(match[1]);
	return Number.isInteger(size) && size >= MIN_VIRTUAL_CUBE_SIZE && size <= MAX_VIRTUAL_CUBE_SIZE
		? size
		: null;
};

export const getVirtualPuzzle = (puzzleType: string): VirtualPuzzle | null => {
	const cubeSize = getVirtualCubeSize(puzzleType);
	if (cubeSize !== null) return { kind: 'cube', size: cubeSize };
	if (puzzleType === PuzzleType.PYRAMINX) return { kind: 'pyraminx' };
	if (puzzleType === PuzzleType.SKEWB) return { kind: 'skewb' };
	return null;
};
