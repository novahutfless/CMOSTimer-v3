import { describe, expect, it } from 'vitest';
import { PuzzleType } from '../../types';
import { getVirtualCubeSize, getVirtualPuzzle } from '../../utils/virtualCube';

describe('Virtual Cube Utils', () => {
	it.each([
		[PuzzleType.TWO, 2],
		[PuzzleType.THREE, 3],
		[PuzzleType.FOUR, 4],
		[PuzzleType.FIVE, 5],
		[PuzzleType.SIX, 6],
		[PuzzleType.SEVEN, 7],
		['7x7x7', 7],
	] as const)('supports regular cube visualizer %s', (type, size) => {
		expect(getVirtualCubeSize(type)).toBe(size);
	});

	it.each([
		PuzzleType.PYRAMINX,
		PuzzleType.TWO_BY_TWO_BY_THREE,
		'1x1',
		'8x8',
	])('rejects unsupported visualizer %s', type => {
		expect(getVirtualCubeSize(type)).toBeNull();
	});

	it('selects the dedicated non-cube 3D renderers', () => {
		expect(getVirtualPuzzle(PuzzleType.PYRAMINX)).toEqual({ kind: 'pyraminx' });
		expect(getVirtualPuzzle(PuzzleType.SKEWB)).toEqual({ kind: 'skewb' });
		expect(getVirtualPuzzle(PuzzleType.CLOCK)).toBeNull();
	});
});
